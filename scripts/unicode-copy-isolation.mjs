import assert from "node:assert/strict";
import { createServer } from "node:http";

// Shared by the real component fixture and deliberate faults. Do not give
// intentional violations a separate guard or exempt them from the verdict.
export async function installIsolationGuards(context, { baseURL, fixturePath, fixture, apiCalls, externalCalls }) {
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL).origin) {
      externalCalls.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      apiCalls.push(url.pathname);
      return route.abort();
    }
    if (url.pathname === fixturePath) return route.fulfill({ contentType: "text/html", body: fixture });
    return route.continue();
  });
  // Vite HMR is an in-process handshake, never a real socket connection.
  await context.routeWebSocket("**/*", socket => {
    const url = new URL(socket.url());
    const httpOrigin = url.origin.replace(/^ws/, "http");
    if (httpOrigin !== new URL(baseURL).origin) externalCalls.push(url.href);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) apiCalls.push(url.pathname);
    if (httpOrigin === new URL(baseURL).origin && url.pathname === "/") {
      socket.send(JSON.stringify({ type: "connected" }));
    } else {
      socket.close();
    }
  });
}

export function assertNoForbiddenRequests({ apiCalls, externalCalls }) {
  assert.deepEqual(apiCalls, [], "No API calls or real credentials");
  assert.deepEqual(externalCalls, [], "No external requests, including blocked attempts");
}

// Serialized into the page by Playwright; keep native outcomes independent
// of the Node-side request records used to judge the isolation guards.
async function attemptTarget({ target, transport, targets }) {
  // Start the whole batch in one browser task, before awaiting any outcome.
  if (targets) return Promise.all(targets.map(target => attemptTarget({ target })));
  let attempts = 0;
  let socket;
  let timer;
  const operation = target.startsWith("ws")
    ? new Promise(resolve => {
      attempts++;
      socket = new WebSocket(target);
      socket.onmessage = event => resolve({ outcome: "message", message: event.data });
      socket.onclose = () => resolve({ outcome: "closed" });
      // A native error alone does not prove the socket was closed.
      socket.onerror = () => {};
    })
    : transport === "xhr" ? new Promise(resolve => {
      attempts++;
      const request = new XMLHttpRequest();
      request.open("POST", target);
      request.onload = () => resolve({ outcome: "escaped" });
      request.onerror = () => resolve({ outcome: "rejected" });
      request.onabort = () => resolve({ outcome: "aborted" });
      request.send("unicode-copy-isolation");
    })
    : transport === "beacon" ? (() => {
      attempts++;
      return Promise.resolve({ outcome: "queued", queued: navigator.sendBeacon(target, "unicode-copy-isolation") });
    })()
    : (async () => {
      attempts++;
      try {
        await fetch(target);
        return { outcome: "escaped" };
      } catch {
        return { outcome: "rejected" };
      }
    })();
  try {
    const outcome = await Promise.race([
      operation,
      new Promise(resolve => { timer = setTimeout(() => resolve({ outcome: "timeout" }), 5000); }),
    ]);
    return { attempts, ...outcome };
  } finally {
    clearTimeout(timer);
    socket?.close();
  }
}

async function attemptInPage(context, page, test) {
  // Queue acceptance does not prove delivery or blocking. Wait for native
  // dispatch before checking records/sentinels, including repeated beacons.
  if (test.transport !== "xhr" && test.transport !== "beacon") {
    return page.evaluate(attemptTarget, test);
  }
  let dispatchTimer;
  let settled;
  const dispatched = new Promise(resolve => {
    settled = request => {
      if (request.url() === test.target) resolve(true);
    };
    context.on("requestfailed", settled);
    context.on("requestfinished", settled);
    dispatchTimer = setTimeout(() => resolve(false), 5000);
  });
  try {
    const result = await page.evaluate(attemptTarget, test);
    assert.equal(await dispatched, true, `${test.name}: browser must finish dispatching the native request`);
    return result;
  } finally {
    clearTimeout(dispatchTimer);
    context.off("requestfailed", settled);
    context.off("requestfinished", settled);
  }
}

export async function checkIsolationFaults(browser, engineName) {
  const arrivals = [];
  const servers = [];
  try {
    // Both origins are disposable loopback sentinels, not Vite or the app.
    // If a guard records but forwards, even a failed HTTP/WS response is caught.
    for (const origin of ["local", "external"]) {
      const server = createServer((request, response) => {
        arrivals.push(`${origin}:http:${request.url}`);
        response.writeHead(200, { "Access-Control-Allow-Origin": "*" }).end("ESCAPED");
      });
      server.on("upgrade", (request, socket) => {
        arrivals.push(`${origin}:websocket:${request.url}`);
        socket.destroy();
      });
      servers.push(server);
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
    }
    const [baseURL, externalURL] = servers.map(server => `http://127.0.0.1:${server.address().port}`);
    const ws = url => url.replace(/^http/, "ws");
    const cases = [
      { name: "http-api-root", target: `${baseURL}/api?probe=root`, apiCalls: ["/api"] },
      { name: "http-api-child", target: `${baseURL}/api/copy-probe?probe=child`, apiCalls: ["/api/copy-probe"] },
      { name: "http-external", target: `${externalURL}/copy-probe?probe=http`, external: true },
      // HTTP classifies external origins first, whereas WS records both.
      { name: "http-external-api", target: `${externalURL}/api/copy-probe?probe=http`, external: true },
      ...["xhr", "beacon"].flatMap(transport => [
        { name: `${transport}-api-root`, transport, target: `${baseURL}/api?probe=${transport}-root`, apiCalls: ["/api"] },
        { name: `${transport}-api-child`, transport, target: `${baseURL}/api/copy-probe?probe=${transport}-child`, apiCalls: ["/api/copy-probe"] },
        { name: `${transport}-external`, transport, target: `${externalURL}/copy-probe?probe=${transport}`, external: true },
        { name: `${transport}-external-api`, transport, target: `${externalURL}/api/copy-probe?probe=${transport}`, external: true },
      ]),
      { name: "ws-api-root", target: `${ws(baseURL)}/api?probe=root`, apiCalls: ["/api"] },
      { name: "ws-api-child", target: `${ws(baseURL)}/api/copy-probe?probe=child`, apiCalls: ["/api/copy-probe"] },
      { name: "ws-external", target: `${ws(externalURL)}/copy-probe?probe=ws`, external: true },
      { name: "ws-external-api", target: `${ws(externalURL)}/api/copy-probe?probe=ws`, external: true, apiCalls: ["/api/copy-probe"] },
      // A root path on another origin must NOT inherit the local HMR exception.
      { name: "ws-external-root", target: `${ws(externalURL)}/?probe=hmr`, external: true },
      { name: "hmr-control", target: `${ws(baseURL)}/?token=fixture`, hmr: true },
    ];
    for (const test of cases) {
      const context = await browser.newContext({
        serviceWorkers: "block",
        // Chromium's loopback permission must not mask a record-but-forward
        // regression by rejecting it before our sentinel can see the request.
        ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
      });
      try {
        const recorded = { apiCalls: [], externalCalls: [] };
        const errors = [];
        await installIsolationGuards(context, {
          baseURL, fixturePath: "/__unicode-copy-isolation",
          fixture: "<!doctype html><title>Unicode copy isolation fault</title>",
          ...recorded,
        });
        const page = await context.newPage();
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(`${baseURL}/__unicode-copy-isolation`);
        const result = await attemptInPage(context, page, test);
        assert.deepEqual(arrivals, [], `${test.name}: no HTTP request or socket upgrade reached either server`);
        assert.deepEqual(result, {
          attempts: 1,
          ...(test.hmr
            ? { outcome: "message", message: JSON.stringify({ type: "connected" }) }
            : test.transport === "beacon"
              ? { outcome: "queued", queued: true }
              : { outcome: test.target.startsWith("ws") ? "closed" : "rejected" }),
        }, `${test.name}: native attempt must settle through the guard`);
        assert.deepEqual(recorded, {
          apiCalls: test.apiCalls ?? [],
          externalCalls: test.external ? [test.target] : [],
        }, `${test.name}: exact recording, once, with no extra entries`);
        assert.deepEqual(errors, [], `${test.name}: no unrelated browser errors`);
        if (test.hmr) {
          assertNoForbiddenRequests(recorded);
        } else {
          assert.throws(() => assertNoForbiddenRequests(recorded), {
            code: "ERR_ASSERTION",
            message: test.apiCalls ? /No API calls or real credentials/ : /No external requests, including blocked attempts/,
          }, `${test.name}: ordinary copy verdict must fail`);
        }
        console.log(`PASS ${engineName} isolation-${test.name}: ${test.hmr ? "in-process HMR accepted" : "blocked, exactly recorded, ordinary verdict rejected"}; zero server arrivals`);
      } finally {
        await context.close();
      }
    }

    // One separate context retains the entire history: consecutive duplicates
    // catch deduplication, then interleaved repeats catch resets or reordering.
    // Ordinary component contexts still make no deliberate forbidden attempts.
    const context = await browser.newContext({
      serviceWorkers: "block",
      ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
    });
    try {
      const recorded = { apiCalls: [], externalCalls: [] };
      const expected = { apiCalls: [], externalCalls: [] };
      const errors = [];
      await installIsolationGuards(context, {
        baseURL, fixturePath: "/__unicode-copy-isolation-repeated",
        fixture: "<!doctype html><title>Unicode copy repeated isolation faults</title>",
        ...recorded,
      });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${baseURL}/__unicode-copy-isolation-repeated`);
      const forbidden = cases.filter(test => !test.hmr);
      const sequence = [
        ...forbidden.flatMap(test => [test, test]),
        ...forbidden.toReversed(),
        ...forbidden,
      ];
      for (const [index, test] of sequence.entries()) {
        const label = `repeated attempt ${index + 1} (${test.name})`;
        const result = await attemptInPage(context, page, test);
        assert.deepEqual(result, {
          attempts: 1,
          ...(test.transport === "beacon"
            ? { outcome: "queued", queued: true }
            : { outcome: test.target.startsWith("ws") ? "closed" : "rejected" }),
        }, `${label}: native attempt must be blocked`);
        expected.apiCalls.push(...(test.apiCalls ?? []));
        if (test.external) expected.externalCalls.push(test.target);
        assert.deepEqual(recorded, expected, `${label}: preserve complete ordered history, including duplicates`);
        assert.deepEqual(arrivals, [], `${label}: no HTTP request or socket upgrade reached either server`);
        assert.throws(() => assertNoForbiddenRequests(recorded), {
          code: "ERR_ASSERTION",
          message: /No API calls or real credentials/,
        }, `${label}: ordinary copy verdict must reject accumulated faults`);
      }
      // The API assertion fails first; independently require the external list
      // to reject too, rather than letting API history mask missing externals.
      assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
        code: "ERR_ASSERTION",
        message: /No external requests, including blocked attempts/,
      }, "repeated external faults must also fail the ordinary verdict");
      assert.deepEqual(errors, [], "repeated faults: no unrelated browser errors");
      console.log(`PASS ${engineName} isolation-repeated: ${sequence.length} blocked attempts; complete ordered duplicate records; ordinary verdict rejected; zero server arrivals`);
    } finally {
      await context.close();
    }

    // A new document must not clear context-owned evidence or its guards.
    // Distinct query URLs are both fulfilled by the shared fixture route.
    const navigationContext = await browser.newContext({
      serviceWorkers: "block",
      ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
    });
    try {
      const recorded = { apiCalls: [], externalCalls: [] };
      const expected = { apiCalls: [], externalCalls: [] };
      const errors = [];
      const fixturePath = "/__unicode-copy-isolation-navigation";
      await installIsolationGuards(navigationContext, {
        baseURL, fixturePath,
        fixture: "<!doctype html><title>Unicode copy navigation isolation faults</title>",
        ...recorded,
      });
      const page = await navigationContext.newPage();
      page.on("pageerror", error => errors.push(error.message));
      const forbidden = cases.filter(test => !test.hmr);
      for (const phase of ["before", "after"]) {
        const fixtureURL = `${baseURL}${fixturePath}?document=${phase}`;
        const response = await page.goto(fixtureURL);
        assert.equal(response.status(), 200, `${phase}: fixture navigation succeeds`);
        assert.equal(page.url(), fixtureURL, `${phase}: reached the requested fixture page`);
        assert.equal(await page.title(), "Unicode copy navigation isolation faults");
        assert.equal(await page.evaluate(() => window.isolationPreviousDocument), undefined,
          `${phase}: navigation created a fresh document, not a same-document transition`);
        await page.evaluate(() => { window.isolationPreviousDocument = true; });
        assert.equal(page.context(), navigationContext, `${phase}: reuse the same browser context`);
        assert.deepEqual(recorded, expected, `${phase}: navigation preserves all prior evidence`);
        assert.deepEqual(arrivals, [], `${phase}: fulfilled navigation never reaches either sentinel`);
        if (phase === "after") {
          assert.throws(() => assertNoForbiddenRequests(recorded), {
            code: "ERR_ASSERTION",
            message: /No API calls or real credentials/,
          }, "navigation alone cannot erase the failing ordinary verdict");
        }
        // Repeat every target on both documents, reversing the second batch
        // so resets, deduplication and reordering cannot hide in equal batches.
        const sequence = (phase === "before" ? forbidden : forbidden.toReversed())
          .flatMap(test => [test, test]);
        for (const [index, test] of sequence.entries()) {
          const label = `navigation ${phase} attempt ${index + 1} (${test.name})`;
          const result = await attemptInPage(navigationContext, page, test);
          assert.deepEqual(result, {
            attempts: 1,
            ...(test.transport === "beacon"
              ? { outcome: "queued", queued: true }
              : { outcome: test.target.startsWith("ws") ? "closed" : "rejected" }),
          }, `${label}: native attempt must be blocked`);
          expected.apiCalls.push(...(test.apiCalls ?? []));
          if (test.external) expected.externalCalls.push(test.target);
          assert.deepEqual(recorded, expected, `${label}: retain ordered pre/post-navigation records and duplicates`);
          assert.deepEqual(arrivals, [], `${label}: no HTTP request or socket upgrade reached either server`);
          assert.throws(() => assertNoForbiddenRequests(recorded), {
            code: "ERR_ASSERTION",
            message: /No API calls or real credentials/,
          }, `${label}: ordinary copy verdict must reject accumulated faults`);
        }
        assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
          code: "ERR_ASSERTION",
          message: /No external requests, including blocked attempts/,
        }, `${phase}: external evidence independently fails the ordinary verdict`);
      }
      assert.deepEqual(errors, [], "navigation faults: no unrelated browser errors");
      console.log(`PASS ${engineName} isolation-navigation: ${forbidden.length * 4} blocked attempts across two documents in one context; complete ordered duplicate records; ordinary verdict rejected; zero server arrivals`);
    } finally {
      await navigationContext.close();
    }

    // Destroying a page is distinct from replacing its document. Evidence
    // belongs to the context and must outlive the tab that produced it.
    const tabContext = await browser.newContext({
      serviceWorkers: "block",
      ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
    });
    try {
      const recorded = { apiCalls: [], externalCalls: [] };
      const expected = { apiCalls: [], externalCalls: [] };
      const errors = [];
      const fixturePath = "/__unicode-copy-isolation-tabs";
      await installIsolationGuards(tabContext, {
        baseURL, fixturePath,
        fixture: "<!doctype html><title>Unicode copy tab isolation faults</title>",
        ...recorded,
      });
      const firstTab = await tabContext.newPage();
      const secondTab = await tabContext.newPage();
      for (const [index, page] of [firstTab, secondTab].entries()) {
        page.on("pageerror", error => errors.push(error.message));
        assert.equal(page.context(), tabContext, `tab ${index + 1}: share the guarded context`);
        const response = await page.goto(`${baseURL}${fixturePath}?tab=${index + 1}`);
        assert.equal(response.status(), 200, `tab ${index + 1}: fixture navigation succeeds`);
        assert.equal(await page.title(), "Unicode copy tab isolation faults");
      }
      assert.deepEqual(tabContext.pages(), [firstTab, secondTab], "two distinct tabs are open before faults");
      assert.deepEqual(recorded, expected, "opening tabs creates no forbidden attempts");
      assert.deepEqual(arrivals, [], "both fulfilled tabs bypass the sentinels");
      assertNoForbiddenRequests(recorded);

      function assertTabEvidence(label) {
        assert.deepEqual(recorded, expected, `${label}: retain ordered evidence from both tabs, including duplicates`);
        assert.deepEqual(arrivals, [], `${label}: no HTTP request or socket upgrade reached either server`);
        assert.throws(() => assertNoForbiddenRequests(recorded), {
          code: "ERR_ASSERTION",
          message: /No API calls or real credentials/,
        }, `${label}: ordinary verdict must reject accumulated faults`);
        if (expected.externalCalls.length) {
          assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
            code: "ERR_ASSERTION",
            message: /No external requests, including blocked attempts/,
          }, `${label}: external evidence independently fails the ordinary verdict`);
        }
      }

      const forbidden = cases.filter(test => !test.hmr && !test.transport);
      for (const [tabIndex, page] of [firstTab, secondTab].entries()) {
        if (tabIndex === 1) {
          await firstTab.close();
          assert.equal(firstTab.isClosed(), true, "first tab is destroyed, not merely navigated");
          assert.equal(secondTab.isClosed(), false, "second tab survives first-tab closure");
          assert.deepEqual(tabContext.pages(), [secondTab], "only the second tab remains in the same context");
          assertTabEvidence("after first-tab closure, before any second-tab attempt");
        }
        // Consecutive duplicates on each tab and reversed ordering on the
        // survivor expose per-page resets, deduplication and reordered history.
        const sequence = (tabIndex === 0 ? forbidden : forbidden.toReversed())
          .flatMap(test => [test, test]);
        for (const [index, test] of sequence.entries()) {
          const label = `tab ${tabIndex + 1} attempt ${index + 1} (${test.name})`;
          const result = await attemptInPage(tabContext, page, test);
          assert.deepEqual(result, {
            attempts: 1,
            outcome: test.target.startsWith("ws") ? "closed" : "rejected",
          }, `${label}: native attempt must be blocked`);
          expected.apiCalls.push(...(test.apiCalls ?? []));
          if (test.external) expected.externalCalls.push(test.target);
          assertTabEvidence(label);
        }
      }
      assert.deepEqual(errors, [], "tab closure faults: no unrelated browser errors");
      console.log(`PASS ${engineName} isolation-tab-closure: ${forbidden.length * 4} blocked attempts across two tabs; first tab destroyed; complete ordered duplicate records; ordinary verdict rejected; zero server arrivals`);
    } finally {
      await tabContext.close();
    }

    // Reload is a distinct lifecycle path from navigating to another URL.
    // Keep the same page/context and guards; only the document is replaced.
    const reloadContext = await browser.newContext({
      serviceWorkers: "block",
      ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
    });
    try {
      const recorded = { apiCalls: [], externalCalls: [] };
      const expected = { apiCalls: [], externalCalls: [] };
      const errors = [];
      const fixturePath = "/__unicode-copy-isolation-reload";
      const fixtureURL = `${baseURL}${fixturePath}`;
      await installIsolationGuards(reloadContext, {
        baseURL, fixturePath,
        fixture: "<!doctype html><title>Unicode copy reload isolation faults</title>",
        ...recorded,
      });
      const page = await reloadContext.newPage();
      page.on("pageerror", error => errors.push(error.message));
      const forbidden = cases.filter(test => !test.hmr && !test.transport);
      for (const phase of ["before", "after"]) {
        const response = phase === "before"
          ? await page.goto(fixtureURL)
          : await page.reload();
        // Check old evidence immediately, before any post-reload attempt or
        // document evaluation could repopulate a mistakenly cleared history.
        assert.deepEqual(recorded, expected, `${phase}: reload preserves all prior evidence`);
        assert.deepEqual(arrivals, [], `${phase}: fulfilled fixture never reaches either sentinel`);
        if (phase === "after") {
          assert.throws(() => assertNoForbiddenRequests(recorded), {
            code: "ERR_ASSERTION",
            message: /No API calls or real credentials/,
          }, "reload alone cannot erase the failing ordinary verdict");
          assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
            code: "ERR_ASSERTION",
            message: /No external requests, including blocked attempts/,
          }, "reload alone cannot erase external evidence");
        }
        assert.equal(response.status(), 200, `${phase}: fixture load succeeds`);
        assert.equal(page.url(), fixtureURL, `${phase}: reload retains the exact fixture URL`);
        assert.equal(page.context(), reloadContext, `${phase}: reuse the same browser context`);
        assert.equal(await page.title(), "Unicode copy reload isolation faults");
        assert.equal(await page.evaluate(() => window.isolationPreviousDocument), undefined,
          `${phase}: fixture load created a fresh document`);
        await page.evaluate(() => { window.isolationPreviousDocument = true; });
        assert.equal(await page.evaluate(() => window.isolationPreviousDocument), true,
          `${phase}: document marker was established before reload`);
        // Consecutive duplicates and reversed post-reload order expose lost,
        // deduplicated or reordered evidence across the document boundary.
        const sequence = (phase === "before" ? forbidden : forbidden.toReversed())
          .flatMap(test => [test, test]);
        for (const [index, test] of sequence.entries()) {
          const label = `reload ${phase} attempt ${index + 1} (${test.name})`;
          const result = await attemptInPage(reloadContext, page, test);
          assert.deepEqual(result, {
            attempts: 1,
            outcome: test.target.startsWith("ws") ? "closed" : "rejected",
          }, `${label}: native attempt must be blocked`);
          expected.apiCalls.push(...(test.apiCalls ?? []));
          if (test.external) expected.externalCalls.push(test.target);
          assert.deepEqual(recorded, expected, `${label}: retain ordered pre/post-reload records and duplicates`);
          assert.deepEqual(arrivals, [], `${label}: no HTTP request or socket upgrade reached either server`);
          assert.throws(() => assertNoForbiddenRequests(recorded), {
            code: "ERR_ASSERTION",
            message: /No API calls or real credentials/,
          }, `${label}: ordinary copy verdict must reject accumulated faults`);
        }
        assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
          code: "ERR_ASSERTION",
          message: /No external requests, including blocked attempts/,
        }, `${phase}: external evidence independently fails the ordinary verdict`);
      }
      assert.deepEqual(errors, [], "reload faults: no unrelated browser errors");
      console.log(`PASS ${engineName} isolation-reload: ${forbidden.length * 4} blocked attempts across a native reload in one context; fresh document; complete ordered duplicate records; ordinary verdict rejected; zero server arrivals`);
    } finally {
      await reloadContext.close();
    }

    // No surviving page may be required to retain context-owned evidence.
    // Reopen in the same context without reinstalling or replacing the guards.
    const pageFreeContext = await browser.newContext({
      serviceWorkers: "block",
      ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
    });
    try {
      const recorded = { apiCalls: [], externalCalls: [] };
      const expected = { apiCalls: [], externalCalls: [] };
      const errors = [];
      let contextClosed = false;
      pageFreeContext.on("close", () => { contextClosed = true; });
      const fixturePath = "/__unicode-copy-isolation-page-free";
      await installIsolationGuards(pageFreeContext, {
        baseURL, fixturePath,
        fixture: "<!doctype html><title>Unicode copy page-free isolation faults</title>",
        ...recorded,
      });

      function assertPageFreeEvidence(label) {
        assert.deepEqual(recorded, expected, `${label}: retain complete ordered history, including duplicates`);
        assert.deepEqual(arrivals, [], `${label}: no HTTP request or socket upgrade reached either server`);
        assert.equal(contextClosed, false, `${label}: the original guarded context remains open`);
        assert.throws(() => assertNoForbiddenRequests(recorded), {
          code: "ERR_ASSERTION",
          message: /No API calls or real credentials/,
        }, `${label}: ordinary verdict must reject accumulated faults`);
        if (expected.externalCalls.length) {
          assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
            code: "ERR_ASSERTION",
            message: /No external requests, including blocked attempts/,
          }, `${label}: external evidence independently fails the ordinary verdict`);
        }
      }

      const forbidden = cases.filter(test => !test.hmr && !test.transport);
      let previousPage;
      for (const phase of ["before", "after"]) {
        const page = await pageFreeContext.newPage();
        page.on("pageerror", error => errors.push(error.message));
        assert.notEqual(page, previousPage, `${phase}: use a newly created page`);
        assert.equal(page.context(), pageFreeContext, `${phase}: reuse the original guarded context`);
        assert.deepEqual(pageFreeContext.pages(), [page], `${phase}: only the new page is open`);
        if (phase === "after") assertPageFreeEvidence("after reopening, before navigation or new attempts");
        const response = await page.goto(`${baseURL}${fixturePath}?phase=${phase}`);
        assert.equal(response.status(), 200, `${phase}: shared fixture route remains installed`);
        assert.equal(await page.title(), "Unicode copy page-free isolation faults");
        assert.deepEqual(recorded, expected, `${phase}: fixture navigation preserves evidence`);
        assert.deepEqual(arrivals, [], `${phase}: fulfilled fixture bypasses both sentinels`);
        if (phase === "before") assertNoForbiddenRequests(recorded);
        else assertPageFreeEvidence("after reopening and navigation, before new attempts");

        const sequence = (phase === "before" ? forbidden : forbidden.toReversed())
          .flatMap(test => [test, test]);
        for (const [index, test] of sequence.entries()) {
          const label = `page-free ${phase} attempt ${index + 1} (${test.name})`;
          const result = await attemptInPage(pageFreeContext, page, test);
          assert.deepEqual(result, {
            attempts: 1,
            outcome: test.target.startsWith("ws") ? "closed" : "rejected",
          }, `${label}: native attempt must still be blocked by the shared guards`);
          expected.apiCalls.push(...(test.apiCalls ?? []));
          if (test.external) expected.externalCalls.push(test.target);
          assertPageFreeEvidence(label);
        }
        if (phase === "before") {
          assertPageFreeEvidence("before closing every page");
          const pages = pageFreeContext.pages();
          await Promise.all(pages.map(openPage => openPage.close()));
          assert.ok(pages.every(closedPage => closedPage.isClosed()), "every original page is destroyed");
          assert.deepEqual(pageFreeContext.pages(), [], "the guarded context has no surviving pages");
          assertPageFreeEvidence("page-free interval, before reopening");
          previousPage = page;
        }
      }
      assert.deepEqual(errors, [], "page-free faults: no unrelated browser errors");
      console.log(`PASS ${engineName} isolation-page-free: ${forbidden.length * 4} blocked attempts; all original pages destroyed before reopening in the same context; complete ordered duplicate records; ordinary verdict rejected; zero server arrivals`);
    } finally {
      await pageFreeContext.close();
    }

    // A script-opened popup closes itself through the browser lifecycle,
    // rather than being a second test-runner-created tab.
    const popupContext = await browser.newContext({
      serviceWorkers: "block",
      ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
    });
    try {
      const recorded = { apiCalls: [], externalCalls: [] };
      const expected = { apiCalls: [], externalCalls: [] };
      const errors = [];
      const fixturePath = "/__unicode-copy-isolation-popup";
      await installIsolationGuards(popupContext, {
        baseURL, fixturePath,
        fixture: "<!doctype html><title>Unicode copy popup isolation faults</title>",
        ...recorded,
      });
      popupContext.on("page", page => page.on("pageerror", error => errors.push(error.message)));
      const opener = await popupContext.newPage();
      await opener.goto(`${baseURL}${fixturePath}?page=opener`);
      const popupURL = `${baseURL}${fixturePath}?page=popup`;
      const [popup, opened] = await Promise.all([
        opener.waitForEvent("popup"),
        opener.evaluate(url => {
          window.isolationPopup = window.open(url, "_blank");
          return window.isolationPopup !== null;
        }, popupURL),
      ]);
      assert.equal(opened, true, "native window.open returns a popup");
      await popup.waitForLoadState("load");
      assert.equal(popup.url(), popupURL, "native popup reaches the fulfilled loopback fixture");
      assert.equal(await popup.title(), "Unicode copy popup isolation faults");
      assert.equal(await popup.opener(), opener, "popup has the original page as its opener");
      assert.equal(await popup.evaluate(() => window.opener !== null), true, "native opener relationship exists");
      assert.equal(popup.context(), popupContext, "popup inherits the guarded browser context");
      assert.deepEqual(popupContext.pages(), [opener, popup], "opener and native popup are distinct live pages");
      assert.deepEqual(recorded, expected, "opening the popup creates no forbidden attempts");
      assert.deepEqual(arrivals, [], "fulfilled opener and popup bypass both sentinels");
      assertNoForbiddenRequests(recorded);

      function assertPopupEvidence(label) {
        assert.deepEqual(recorded, expected, `${label}: retain ordered context-owned evidence, including duplicates`);
        assert.deepEqual(arrivals, [], `${label}: no HTTP request or socket upgrade reached either sentinel`);
        assert.throws(() => assertNoForbiddenRequests(recorded), {
          code: "ERR_ASSERTION",
          message: /No API calls or real credentials/,
        }, `${label}: ordinary verdict must keep rejecting`);
        if (expected.externalCalls.length) {
          assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
            code: "ERR_ASSERTION",
            message: /No external requests, including blocked attempts/,
          }, `${label}: external evidence independently keeps rejecting`);
        }
      }

      const forbidden = cases.filter(test => !test.hmr && !test.transport);
      for (const [pageIndex, page] of [popup, opener].entries()) {
        if (pageIndex === 1) {
          // Register the close observer first and return from evaluation before
          // destroying its execution context. No Playwright page.close here.
          const closed = popup.waitForEvent("close");
          await popup.evaluate(() => { setTimeout(() => window.close(), 0); });
          await closed;
          assert.equal(popup.isClosed(), true, "popup destroys itself through native window.close");
          assert.equal(opener.isClosed(), false, "opener survives popup self-closure");
          assert.equal(await opener.evaluate(() => window.isolationPopup.closed), true,
            "native opener handle observes popup closure");
          assert.deepEqual(popupContext.pages(), [opener], "only opener remains in the guarded context");
          assertPopupEvidence("after popup self-closure, before opener attempts");
        }
        // Reuse identical targets across pages, with reversed opener order, so
        // deduplication, per-page resets and reordered history cannot pass.
        const sequence = (pageIndex === 0 ? forbidden : forbidden.toReversed())
          .flatMap(test => [test, test]);
        for (const [index, test] of sequence.entries()) {
          const label = `${pageIndex === 0 ? "popup" : "opener"} attempt ${index + 1} (${test.name})`;
          const result = await attemptInPage(popupContext, page, test);
          assert.deepEqual(result, {
            attempts: 1,
            outcome: test.target.startsWith("ws") ? "closed" : "rejected",
          }, `${label}: native attempt settles as blocked before any page closure`);
          expected.apiCalls.push(...(test.apiCalls ?? []));
          if (test.external) expected.externalCalls.push(test.target);
          assertPopupEvidence(label);
        }
      }
      assert.deepEqual(errors, [], "popup lifecycle faults: no unrelated browser errors");
      console.log(`PASS ${engineName} isolation-popup-self-closure: ${forbidden.length * 4} blocked attempts across native popup and surviving opener; complete ordered duplicate records; ordinary verdict keeps rejecting; zero server arrivals`);
    } finally {
      await popupContext.close();
    }

    // Unlike the lifecycle case, the initial parser-run script starts these
    // faults without waiting for load or attaching any popup-page listeners.
    const initialPopupContext = await browser.newContext({
      serviceWorkers: "block",
      ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
    });
    try {
      const recorded = { apiCalls: [], externalCalls: [] };
      const fixturePath = "/__unicode-copy-isolation-popup-initial";
      const batch = cases.filter(test => !test.hmr && !test.transport).flatMap(test => [test, test]);
      await installIsolationGuards(initialPopupContext, {
        baseURL, fixturePath,
        fixture: `<!doctype html><title>Unicode copy initial popup isolation faults</title>
          <script>
            if (window.opener) {
              window.isolationInitialReadyState = document.readyState;
              window.isolationInitialErrors = [];
              addEventListener("error", event => window.isolationInitialErrors.push(event.message));
              addEventListener("unhandledrejection", event =>
                window.isolationInitialErrors.push(String(event.reason)));
              const attemptTarget = ${attemptTarget.toString()};
              window.isolationInitialResults = attemptTarget({
                targets: ${JSON.stringify(batch.map(test => test.target))}
              });
            }
          </script>`,
        ...recorded,
      });
      const opener = await initialPopupContext.newPage();
      await opener.goto(`${baseURL}${fixturePath}?page=opener`);
      assertNoForbiddenRequests(recorded);
      assert.deepEqual(arrivals, [], "initial popup: idle opener never reaches either sentinel");
      const popupURL = `${baseURL}${fixturePath}?page=popup`;
      const [popup, opened] = await Promise.all([
        opener.waitForEvent("popup"),
        opener.evaluate(url => {
          window.isolationPopup = window.open(url, "_blank");
          return window.isolationPopup !== null;
        }, popupURL),
      ]);
      assert.equal(opened, true, "initial popup: native window.open succeeds");
      // Read only: do not initiate requests with evaluate or install page routes
      // or request listeners. Context guards must cover parser-time requests.
      await popup.waitForLoadState("load");
      const initial = await popup.evaluate(async () => ({
        readyState: window.isolationInitialReadyState,
        results: await window.isolationInitialResults,
        errors: window.isolationInitialErrors,
      }));
      assert.equal(initial.readyState, "loading", "initial popup: attempts start in the first inline script, before load");
      assert.equal(popup.url(), popupURL, "initial popup: native navigation reaches the loopback fixture");
      assert.equal(popup.context(), initialPopupContext, "initial popup inherits the already guarded context");
      assert.equal(await popup.opener(), opener, "initial popup has the native opener");
      assert.deepEqual(initialPopupContext.pages(), [opener, popup], "initial popup and opener are distinct live pages");
      assert.equal(initial.results.length, batch.length, "initial popup: all native attempts settle");
      for (const [index, test] of batch.entries()) {
        assert.deepEqual(initial.results[index], {
          attempts: 1,
          outcome: test.target.startsWith("ws") ? "closed" : "rejected",
        }, `initial popup attempt ${index + 1} (${test.name}): native outcome is blocked`);
      }
      assert.deepEqual(initial.errors, [], "initial popup: no unrelated inline-script errors");
      const expected = {
        apiCalls: batch.flatMap(test => test.apiCalls ?? []).sort(),
        externalCalls: batch.filter(test => test.external).map(test => test.target).sort(),
      };
      const history = { apiCalls: [...recorded.apiCalls], externalCalls: [...recorded.externalCalls] };
      function assertInitialPopupEvidence(label) {
        // Concurrent transports may arrive in either order; preserve exact
        // multiplicities, then also require unchanged arrival order on closure.
        assert.deepEqual({
          apiCalls: [...recorded.apiCalls].sort(),
          externalCalls: [...recorded.externalCalls].sort(),
        }, expected, `${label}: exact context-owned evidence, including every duplicate`);
        assert.deepEqual(recorded, history, `${label}: complete arrival history survives unchanged`);
        assert.deepEqual(arrivals, [], `${label}: neither sentinel receives HTTP or socket upgrades`);
        assert.throws(() => assertNoForbiddenRequests(recorded), {
          code: "ERR_ASSERTION",
          message: /No API calls or real credentials/,
        }, `${label}: ordinary verdict rejects initial popup API attempts`);
        assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
          code: "ERR_ASSERTION",
          message: /No external requests, including blocked attempts/,
        }, `${label}: external evidence independently rejects the ordinary verdict`);
      }
      assertInitialPopupEvidence("before initial popup closure");
      const closed = popup.waitForEvent("close");
      await popup.evaluate(() => { setTimeout(() => window.close(), 0); });
      await closed;
      assert.equal(popup.isClosed(), true, "initial popup closes itself through native window.close");
      assert.equal(opener.isClosed(), false, "initial popup: opener survives");
      assert.equal(await opener.evaluate(() => window.isolationPopup.closed), true,
        "initial popup: native opener handle observes closure");
      assert.deepEqual(initialPopupContext.pages(), [opener], "initial popup: only the opener remains");
      assertInitialPopupEvidence("after initial popup self-closure");
      console.log(`PASS ${engineName} isolation-popup-initial: ${batch.length} parser-time native attempts blocked without popup-page listeners; exact duplicate context evidence survives self-closure; ordinary verdict rejected; zero server arrivals`);
    } finally {
      await initialPopupContext.close();
    }

    // Inverse lifecycle: both native relatives contribute before the opener
    // is destroyed, then the same popup continues in the same guarded context.
    const survivingPopupContext = await browser.newContext({
      serviceWorkers: "block",
      ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
    });
    try {
      const recorded = { apiCalls: [], externalCalls: [] };
      const expected = { apiCalls: [], externalCalls: [] };
      const errors = [];
      let contextClosed = false;
      survivingPopupContext.on("close", () => { contextClosed = true; });
      survivingPopupContext.on("page", page => page.on("pageerror", error => errors.push(error.message)));
      const fixturePath = "/__unicode-copy-isolation-surviving-popup";
      await installIsolationGuards(survivingPopupContext, {
        baseURL, fixturePath,
        fixture: "<!doctype html><title>Unicode copy surviving popup isolation faults</title>",
        ...recorded,
      });
      const opener = await survivingPopupContext.newPage();
      await opener.goto(`${baseURL}${fixturePath}?page=opener`);
      const popupURL = `${baseURL}${fixturePath}?page=popup`;
      const [popup, opened] = await Promise.all([
        opener.waitForEvent("popup"),
        opener.evaluate(url => {
          window.isolationPopup = window.open(url, "_blank");
          return window.isolationPopup !== null;
        }, popupURL),
      ]);
      assert.equal(opened, true, "native window.open creates the surviving popup");
      await popup.waitForLoadState("load");
      assert.equal(popup.url(), popupURL, "native popup reaches the fulfilled loopback fixture");
      assert.equal(await popup.title(), "Unicode copy surviving popup isolation faults");
      assert.equal(await popup.opener(), opener, "popup initially has the original opener");
      assert.equal(await popup.evaluate(() => window.opener !== null), true, "native opener relationship exists");
      assert.equal(popup.context(), survivingPopupContext, "native popup inherits the original guarded context");
      assert.deepEqual(survivingPopupContext.pages(), [opener, popup], "both native relatives are live");
      assert.deepEqual(recorded, expected, "opening native relatives creates no forbidden attempts");
      assert.deepEqual(arrivals, [], "fulfilled opener and popup bypass both sentinels");
      assertNoForbiddenRequests(recorded);
      // A document marker distinguishes survival from replacement or reload.
      await popup.evaluate(() => { window.isolationSurvivingDocument = true; });

      function assertSurvivingPopupEvidence(label) {
        assert.equal(contextClosed, false, `${label}: original guarded context remains open`);
        assert.deepEqual(recorded, expected, `${label}: retain complete ordered evidence, including duplicates`);
        assert.deepEqual(arrivals, [], `${label}: no HTTP request or socket upgrade reached either sentinel`);
        assert.throws(() => assertNoForbiddenRequests(recorded), {
          code: "ERR_ASSERTION",
          message: /No API calls or real credentials/,
        }, `${label}: ordinary verdict keeps rejecting accumulated faults`);
        if (expected.externalCalls.length) {
          assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
            code: "ERR_ASSERTION",
            message: /No external requests, including blocked attempts/,
          }, `${label}: external evidence independently keeps rejecting`);
        }
      }

      const forbidden = cases.filter(test => !test.hmr && !test.transport);
      for (const [phaseIndex, { page, label: phase }] of [
        { page: opener, label: "opener before closure" },
        { page: popup, label: "popup before opener closure" },
        { page: popup, label: "popup after opener closure" },
      ].entries()) {
        if (phaseIndex === 2) {
          assertSurvivingPopupEvidence("before opener destruction, both pages have contributed");
          const closed = opener.waitForEvent("close");
          await opener.close();
          await closed;
          assert.equal(opener.isClosed(), true, "original opener is destroyed");
          assert.equal(popup.isClosed(), false, "native popup survives opener destruction");
          assert.equal(popup.context(), survivingPopupContext, "survivor retains the original guarded context");
          assert.deepEqual(survivingPopupContext.pages(), [popup], "only the original popup remains");
          assertSurvivingPopupEvidence("after opener destruction, before further popup attempts");
          assert.equal(await popup.evaluate(() => window.isolationSurvivingDocument), true,
            "surviving popup retains its original document");
          assert.equal(popup.url(), popupURL, "surviving popup has not navigated");
        }
        // Identical targets recur in both pages and after closure. Alternating
        // order detects lost prefixes, deduplication and reordered histories.
        const sequence = (phaseIndex === 1 ? forbidden.toReversed() : forbidden)
          .flatMap(test => [test, test]);
        for (const [index, test] of sequence.entries()) {
          const label = `${phase} attempt ${index + 1} (${test.name})`;
          const result = await attemptInPage(survivingPopupContext, page, test);
          assert.deepEqual(result, {
            attempts: 1,
            outcome: test.target.startsWith("ws") ? "closed" : "rejected",
          }, `${label}: native attempt must settle through the shared guards`);
          expected.apiCalls.push(...(test.apiCalls ?? []));
          if (test.external) expected.externalCalls.push(test.target);
          assertSurvivingPopupEvidence(label);
        }
      }
      assert.equal(popup.isClosed(), false, "popup remains alive after all additional attempts");
      assert.deepEqual(errors, [], "surviving popup lifecycle: no unrelated browser errors");
      console.log(`PASS ${engineName} isolation-popup-outlives-opener: ${forbidden.length * 6} blocked attempts before and after opener destruction in the same context; complete ordered duplicate records; ordinary verdict keeps rejecting; zero server arrivals`);
    } finally {
      await survivingPopupContext.close();
    }

    // Concurrent HTTP and WS routing can arrive in either order. Compare
    // multisets (not Sets) so every duplicate must survive in the history.
    const concurrentContext = await browser.newContext({
      serviceWorkers: "block",
      ...(browser.browserType().name() === "chromium" ? { permissions: ["local-network-access"] } : {}),
    });
    try {
      const recorded = { apiCalls: [], externalCalls: [] };
      const errors = [];
      const fixturePath = "/__unicode-copy-isolation-concurrent";
      await installIsolationGuards(concurrentContext, {
        baseURL, fixturePath,
        fixture: "<!doctype html><title>Unicode copy concurrent isolation faults</title>",
        ...recorded,
      });
      const page = await concurrentContext.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${baseURL}${fixturePath}`);
      const batch = cases.filter(test => !test.hmr && !test.transport).flatMap(test => [test, test]);
      const results = await page.evaluate(attemptTarget, { targets: batch.map(test => test.target) });
      assert.equal(results.length, batch.length, "concurrent faults: every attempt must settle");
      for (const [index, test] of batch.entries()) {
        assert.deepEqual(results[index], {
          attempts: 1,
          outcome: test.target.startsWith("ws") ? "closed" : "rejected",
        }, `concurrent attempt ${index + 1} (${test.name}): native attempt must be blocked`);
      }
      assert.deepEqual([...recorded.apiCalls].sort(),
        batch.flatMap(test => test.apiCalls ?? []).sort(),
        "concurrent faults: preserve every API record, including duplicates, in any arrival order");
      assert.deepEqual([...recorded.externalCalls].sort(),
        batch.filter(test => test.external).map(test => test.target).sort(),
        "concurrent faults: preserve every external record, including duplicates, in any arrival order");
      assert.deepEqual(arrivals, [], "concurrent faults: no HTTP request or socket upgrade reached either server");
      assert.throws(() => assertNoForbiddenRequests(recorded), {
        code: "ERR_ASSERTION",
        message: /No API calls or real credentials/,
      }, "concurrent faults: ordinary copy verdict must reject accumulated faults");
      assert.throws(() => assertNoForbiddenRequests({ apiCalls: [], externalCalls: recorded.externalCalls }), {
        code: "ERR_ASSERTION",
        message: /No external requests, including blocked attempts/,
      }, "concurrent external faults must also fail the ordinary verdict");
      assert.deepEqual(errors, [], "concurrent faults: no unrelated browser errors");
      console.log(`PASS ${engineName} isolation-concurrent: ${batch.length} blocked attempts; complete duplicate records in any arrival order; ordinary verdict rejected; zero server arrivals`);
    } finally {
      await concurrentContext.close();
    }
  } finally {
    await Promise.all(servers.map(server => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    })));
  }
}
