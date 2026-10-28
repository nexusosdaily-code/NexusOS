import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { chromium, firefox, webkit } from "playwright-core";

// Run every engine by default. Explicit selections must never silently skip an
// unavailable engine (or accept a typo as a successful empty test run).
const engines = new Map(Object.entries({ chromium, firefox, webkit }));
const args = process.argv.slice(2);
const serve = args.includes("--serve");
assert.ok(!serve || args.length === 1, "--serve cannot be combined with engine names");
const engineNames = serve ? [] : args.length ? args : [...engines.keys()];
for (const name of engineNames) assert.ok(engines.has(name), `Unknown browser engine: ${name}`);

// Bundle only the fixture into memory. The server cannot serve source files,
// accounts, APIs or private files; it has no connection to the application server.
const result = await build({
  configFile: false,
  root: path.resolve("tests/browser/hub-navigation"),
  plugins: [react(), tailwind()],
  css: { postcss: { plugins: [] } },
  resolve: { alias: [
    { find: "@/hooks/use-auth", replacement: path.resolve("tests/browser/hub-navigation/auth.ts") },
    { find: "@", replacement: path.resolve("client/src") },
    { find: "@shared", replacement: path.resolve("shared") },
  ] },
  build: { write: false, minify: false, rollupOptions: { input: {
    navigation: path.resolve("tests/browser/hub-navigation/index.html"),
    isolation: path.resolve("tests/browser/hub-navigation/isolation.html"),
    popup: path.resolve("tests/browser/hub-navigation/popup.html"),
    redirect: path.resolve("tests/browser/hub-navigation/redirect.html"),
    worker: path.resolve("tests/browser/hub-navigation/worker.html"),
  } } },
  logLevel: "warn",
});
const assets = new Map(result.output.map(asset => [
  `/${asset.fileName}`, asset.type === "asset" ? asset.source : asset.code,
]));
const reachedForbidden = [];
const reachedRedirects = [];
// Register exact runner-owned targets, never accept an arbitrary redirect URL.
const redirectTargets = new Map();
const server = createServer((request, response) => {
  const pathname = new URL(request.url, "http://fixture.invalid").pathname;
  if (pathname.startsWith("/api")) reachedForbidden.push(`api:${request.url}`);
  if (redirectTargets.has(request.url)) {
    reachedRedirects.push(request.url);
    response.writeHead(302, { Location: redirectTargets.get(request.url) }).end();
    return;
  }
  const key = pathname === "/" ? "/index.html" : pathname;
  if (!assets.has(key)) { response.writeHead(404).end(); return; }
  response.setHeader("Content-Type", key.endsWith(".html") ? "text/html" :
    key.endsWith(".css") ? "text/css" : "application/javascript");
  response.end(assets.get(key));
});
server.on("upgrade", (request, socket) => {
  reachedForbidden.push(`websocket:${request.url}`);
  socket.destroy();
});
await new Promise(resolve => server.listen(serve ? 5174 : 0, "0.0.0.0", resolve));
const baseURL = `http://127.0.0.1:${server.address().port}`;
if (serve) {
  console.log(`Isolated navigation fixture: ${baseURL}`);
} else {
  try {
    await mkdir("generated-artifacts/hub-navigation", { recursive: true });
    for (const engineName of engineNames) await checkEngine(engineName);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function checkEngine(engineName) {
  let browser;
  try {
    browser = await engines.get(engineName).launch({
      headless: true,
      ...(engineName === "chromium" ? {
        ...(existsSync("/repl/tools/bin/chromium") ? { executablePath: "/repl/tools/bin/chromium" } : {}),
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      } : {}),
    }).catch(cause => {
      throw new Error(`Cannot launch requested engine ${engineName}. Install its matching browser with ` +
        `node node_modules/playwright-core/cli.js install ${engineName} and ensure host libraries are available.`,
      { cause });
    });
    await checkIsolationFaults(browser, engineName);
    const scenarios = [
      ...[320, 360, 390].map(width => ({ name: `touch-${width}`, width, text: 100, mobile: true })),
      ...[320, 360, 390].map(width => ({ name: `text-200-${width}`, width, text: 200, mobile: true })),
      // Desktop page zoom reduces the CSS layout viewport: 1280/4 = 320.
      // deviceScaleFactor alone would change pixels, not exercise reflow.
      { name: "zoom-equivalent-400", width: 1280 / 4, text: 100, mobile: false },
      { name: "zoom-equivalent-200-text-200", width: 1280 / 2, text: 200, mobile: false },
    ];
    for (const { name, width, text, mobile } of scenarios) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        // Firefox has no Playwright isMobile support. Keep native touch input
        // at narrow widths without claiming Android/iOS device emulation.
        ...(engineName !== "firefox" ? { isMobile: mobile } : {}),
        hasTouch: true, serviceWorkers: "block",
      });
      const page = await context.newPage();
      const forbidden = [], errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await installIsolationGuards(context, forbidden);
      await page.goto(`${baseURL}/?text=${text}`);
      assert.equal(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)),
        16 * text / 100, `${name}: actual root text size`);
      const trigger = page.getByRole("button", { name: "Data & Storage" });
      const quick = page.getByRole("button", { name: "Wave Vault", exact: true });
      const vault = page.getByRole("link", { name: "Wave Vault", exact: true });
      const outside = page.getByTestId("outside");
      async function textSize(locator, baseSize, label) {
        assert.equal(await locator.locator("span").first().evaluate(el =>
          parseFloat(getComputedStyle(el).fontSize)), baseSize * text / 100,
        `${name}: ${label} text is actually enlarged, not just the root`);
      }
      async function expanded(expected) {
        await page.waitForFunction(({ expected }) =>
          [...document.querySelectorAll("button")].find(b => b.textContent.includes("Data & Storage"))
            ?.getAttribute("aria-expanded") === String(expected), { expected });
        assert.equal(await page.getByRole("region", { name: "Data & Storage" }).count(), expected ? 1 : 0);
      }
      async function fits(locator, label) {
        await locator.scrollIntoViewIfNeeded();
        assert.ok(await locator.isVisible(), `${name}: ${label} visible`);
        const bounds = await locator.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `${name}: ${label} fits viewport`);
        assert.ok(bounds.height >= 44, `${name}: ${label} touch target`);
        assert.ok(await locator.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight),
          `${name}: ${label} not clipped`);
        assert.ok(await locator.evaluate(el => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          const box = el.getBoundingClientRect();
          const boxes = [box];
          for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor);
            if (/(hidden|clip|auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) {
              boxes.push(ancestor.getBoundingClientRect());
            }
          }
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            if (![...range.getClientRects()].every(r => boxes.every(b =>
              r.left >= b.left - 1 && r.right <= b.right + 1 &&
              r.top >= b.top - 1 && r.bottom <= b.bottom + 1))) return false;
          }
          return true;
        }), `${name}: ${label} full text fits including clipping ancestors`);
      }
      async function noOverflow(state) {
        assert.ok(await page.evaluate(() =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.body.scrollWidth <= innerWidth), `${name}: no horizontal overflow ${state}`);
        assert.ok(await page.evaluate(expectedWidth =>
          innerWidth <= expectedWidth && document.documentElement.scrollWidth <= expectedWidth, width),
        `${name}: mobile auto-scaling must not hide horizontal overflow ${state}`);
      }
      async function tabTo(locator, backwards = false) {
        for (let i = 0; i < 60; i++) {
          await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
          if (await locator.evaluate(el => document.activeElement === el)) return;
        }
        assert.fail("Target unreachable using Tab");
      }
      async function focusVisible(locator) {
        const focus = await locator.evaluate(el => {
          const style = getComputedStyle(el);
          return { active: document.activeElement === el, visible: el.matches(":focus-visible"),
            style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
        });
        assert.ok(focus.active && focus.visible && focus.style !== "none" &&
          parseFloat(focus.width) >= 2 && focus.color !== "rgba(0, 0, 0, 0)",
        `visible keyboard focus at ${width}: ${JSON.stringify(focus)}`);
        await fits(locator, "Keyboard-focused control");
        const clipping = await locator.evaluate(el => {
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const outset = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
          if (box.left - outset < 0 || box.right + outset > innerWidth ||
              box.top - outset < 0 || box.bottom + outset > innerHeight) {
            return { viewport: { width: innerWidth, height: innerHeight }, box: box.toJSON(), outset };
          }
          for (let parent = el.parentElement; parent; parent = parent.parentElement) {
            const css = getComputedStyle(parent), b = parent.getBoundingClientRect();
            if (/(hidden|clip|auto|scroll)/.test(css.overflowX) &&
                (box.left - outset < b.left || box.right + outset > b.right)) return { ancestor: parent.tagName };
            if (/(hidden|clip|auto|scroll)/.test(css.overflowY) &&
                (box.top - outset < b.top || box.bottom + outset > b.bottom)) return { ancestor: parent.tagName };
          }
          return null;
        });
        assert.equal(clipping, null, `${name}: focus outline not clipped: ${JSON.stringify(clipping)}`);
      }
      await fits(quick, "Quick action");
      await fits(trigger, "Disclosure trigger");
      await textSize(quick, 14, "Quick action");
      await textSize(trigger, 12, "Disclosure trigger");
      await noOverflow("with disclosure closed");
      await quick.tap();
      assert.equal(await page.getByLabel("Destination").textContent(), "/wave-vault");
      // Reset the memory router; no real Wave Vault page or private data loads.
      await page.reload();
      assert.equal(await page.getByLabel("Destination").textContent(), "/hub");
      await trigger.tap();
      await expanded(true);
      await fits(trigger, "Expanded disclosure trigger");
      await fits(vault, "Wave Vault link");
      await textSize(vault, 12, "Wave Vault link");
      await noOverflow("with disclosure open");
      await page.screenshot({ path: `generated-artifacts/hub-navigation/${engineName}-${name}-touch.png` });
      await trigger.tap();
      await expanded(false);
      await trigger.tap();
      await expanded(true);
      await outside.tap();
      await expanded(false);
      await trigger.tap();
      await vault.tap();
      await expanded(false);
      assert.equal(await page.getByLabel("Destination").textContent(), "/wave-vault");
      await page.reload();
      await tabTo(quick);
      await focusVisible(quick);
      await page.screenshot({ path: `generated-artifacts/hub-navigation/${engineName}-${name}-quick-focus.png` });
      await page.keyboard.press("Enter");
      assert.equal(await page.getByLabel("Destination").textContent(), "/wave-vault");
      await page.reload();
      assert.equal(await page.getByLabel("Destination").textContent(), "/hub");
      await tabTo(trigger);
      await focusVisible(trigger);
      await page.screenshot({ path: `generated-artifacts/hub-navigation/${engineName}-${name}-disclosure-focus.png` });
      await page.keyboard.press("Enter");
      await expanded(true);
      await tabTo(vault);
      await focusVisible(vault);
      await noOverflow("with keyboard-open disclosure");
      await page.screenshot({ path: `generated-artifacts/hub-navigation/${engineName}-${name}-link-focus.png` });
      await page.keyboard.press("Escape");
      await expanded(false);
      await focusVisible(trigger);
      await page.keyboard.press("Space");
      await expanded(true);
      await page.keyboard.press("Space");
      await expanded(false);
      await page.keyboard.press("Enter");
      await tabTo(vault);
      await page.keyboard.press("Enter");
      await expanded(false);
      assert.equal(await page.getByLabel("Destination").textContent(), "/wave-vault");
      // Start the focus-leaving case independently. Activating the link removes
      // the focused panel; engines differ in their next sequential Tab origin.
      await page.reload();
      assert.equal(await page.getByLabel("Destination").textContent(), "/hub");
      await tabTo(trigger);
      await page.keyboard.press("Enter");
      await tabTo(page.getByTestId("after"));
      await expanded(false);
      await tabTo(trigger, true);
      await focusVisible(trigger);
      await noOverflow("after keyboard navigation");
      assertNoForbiddenRequests(forbidden);
      assert.deepEqual(errors, [], "No browser runtime errors");
      await context.close();
      console.log(`PASS ${engineName} ${name}: touch, Enter/Space, Tab/Shift+Tab, Escape, unclipped focus/text, no overflow, zero API/external/socket requests`);
    }
  } catch (cause) {
    throw new Error(`Hub navigation checks failed in ${engineName}`, { cause });
  } finally {
    await browser?.close();
  }
}

// Both the ordinary navigation runs and fault cases use these exact guards and
// verdict. A fault must fail the same assertion as an accidental real request.
async function installIsolationGuards(context, forbidden) {
  await context.route("**/*", async route => {
    let url = new URL(route.request().url());
    let method = route.request().method();
    for (let hop = 0; ; hop++) {
      if (url.origin !== baseURL || url.pathname.startsWith("/api")) {
        forbidden.push(url.href);
        return route.abort();
      }
      // Playwright does not route subsequent browser redirect requests.
      // Fetch one hop at a time inside the context guard instead: neither
      // route.fetch's client nor the browser may automatically follow Location.
      const response = await route.fetch({ url: url.href, method, maxRedirects: 0 });
      const status = response.status();
      const location = response.headers().location;
      if (![301, 302, 303, 307, 308].includes(status) || !location) {
        return route.fulfill({ response });
      }
      await response.dispose();
      assert.ok(hop < 20, "Fixture redirect chain exceeded 20 hops");
      url = new URL(location, url);
      if (status === 303 && method !== "HEAD" || [301, 302].includes(status) && method === "POST") {
        method = "GET";
      }
    }
  });
  await context.routeWebSocket("**/*", socket => {
    forbidden.push(socket.url());
    socket.close();
  });
}

function assertNoForbiddenRequests(forbidden) {
  assert.deepEqual(forbidden, [], "No attempted API, external or websocket requests");
}

async function checkIsolationFaults(browser, engineName) {
  // A different loopback port is a genuinely external *origin* to the browser,
  // without DNS, Internet access, application APIs or an actual WS service.
  // These sentinels also catch a guard weakened to record but continue/connect.
  const trap = createServer((request, response) => {
    reachedForbidden.push(`external:${request.url}`);
    response.writeHead(200, { "Access-Control-Allow-Origin": "*" }).end("ESCAPED");
  });
  trap.on("upgrade", (request, socket) => {
    reachedForbidden.push(`websocket:${request.url}`);
    socket.destroy();
  });
  await new Promise(resolve => trap.listen(0, "127.0.0.1", resolve));
  const trapURL = `http://127.0.0.1:${trap.address().port}`;
  try {
    for (const [kind, target] of [
      ["api", `${baseURL}/api/isolation-probe`],
      ["external", `${trapURL}/isolation-probe`],
      ["websocket", `${trapURL.replace("http:", "ws:")}/isolation-probe`],
    ]) {
      const context = await browser.newContext({ serviceWorkers: "block" });
      try {
        const forbidden = [], errors = [];
        const page = await context.newPage();
        page.on("pageerror", error => errors.push(error.message));
        await installIsolationGuards(context, forbidden);
        await page.goto(`${baseURL}/isolation.html?${new URLSearchParams({ kind, target })}`);
        await page.waitForFunction(() => window.isolationResult?.settled, null, { timeout: 10_000 });
        const result = await page.evaluate(() => window.isolationResult);
        assert.deepEqual(result, { kind, target, attempts: 1, settled: true, outcome: "blocked" },
          `${engineName} ${kind}: native request was attempted once and did not succeed`);
        assert.deepEqual(forbidden, [target], `${kind}: exact forbidden target recorded once`);
        assert.deepEqual(reachedForbidden, [], `${kind}: no forbidden request reached a server`);
        assert.deepEqual(errors, [], `${kind}: no unrelated browser errors`);
        assert.throws(() => assertNoForbiddenRequests(forbidden), {
          code: "ERR_ASSERTION", message: /No attempted API, external or websocket requests/,
        }, `${kind}: normal navigation verdict must reject this attempt`);
        console.log(`PASS ${engineName} isolation-${kind}: attempted, blocked, recorded, rejected; no server connection`);
      } finally {
        await context.close();
      }
      await checkPopupFault(browser, engineName, kind, target);
      if (kind !== "websocket") await checkRedirectFault(browser, engineName, kind, target);
      if (kind !== "websocket") await checkWorkerFault(browser, engineName, kind, target);
    }
  } finally {
    await new Promise(resolve => trap.close(resolve));
  }
}

async function checkRedirectFault(browser, engineName, kind, target) {
  const redirectPath = `/isolation-redirect/${kind}`;
  const redirectURL = `${baseURL}${redirectPath}`;
  assert.equal(new URL(target).hostname, "127.0.0.1", "Redirect destination must be loopback-only");
  redirectTargets.set(redirectPath, target);
  reachedRedirects.length = 0;
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const forbidden = [], errors = [], responses = [];
    context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
    context.on("response", response => {
      if (response.url() === target) responses.push(response.status());
    });
    // No page routes: this must protect a new popup before its page event.
    await installIsolationGuards(context, forbidden);
    const opener = await context.newPage();
    await opener.goto(`${baseURL}/redirect.html?${new URLSearchParams({ kind, target: redirectURL })}`);
    const [popup, , failedRequest] = await Promise.all([
      context.waitForEvent("page", { timeout: 10_000 }),
      opener.getByRole("button", { name: "Open synthetic redirect" }).click(),
      context.waitForEvent("requestfailed", {
        predicate: request => request.url() === redirectURL && request.isNavigationRequest(),
        timeout: 10_000,
      }),
    ]);
    assert.notEqual(popup, opener, `${kind}: redirected navigation belongs to a new page`);
    assert.equal(await popup.opener(), opener, `${kind}: redirect popup has the fixture opener`);
    assert.equal(context.pages().length, 2, `${kind}: exactly one redirect popup opened`);
    assert.equal(failedRequest.frame().page(), popup, `${kind}: redirect navigation failed in popup`);
    assert.ok(failedRequest.failure(), `${kind}: native navigation rejected after inspecting HTTP redirect`);
    assert.deepEqual(reachedRedirects, [redirectPath], `${kind}: allowed HTTP redirect reached exactly once`);
    assert.deepEqual(forbidden, [target], `${kind}: redirected destination, not allowed entry, recorded once`);
    assert.deepEqual(responses, [], `${kind}: forbidden destination received no HTTP response`);
    assert.deepEqual(reachedForbidden, [], `${kind}: no redirected forbidden request reached either server`);
    assert.deepEqual(errors, [], `${kind}: no unrelated browser errors`);
    assert.throws(() => assertNoForbiddenRequests(forbidden), {
      code: "ERR_ASSERTION", message: /No attempted API, external or websocket requests/,
    }, `${kind}: normal navigation verdict must reject this redirect`);
    console.log(`PASS ${engineName} isolation-redirect-${kind}: allowed HTTP 302 reached, destination blocked, recorded, rejected; no forbidden server connection`);
  } finally {
    redirectTargets.delete(redirectPath);
    await context.close();
  }
}

async function checkPopupFault(browser, engineName, kind, target) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const forbidden = [], errors = [], responses = [];
    context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
    context.on("response", response => {
      if (response.url() === target) responses.push(response.status());
    });
    // Install before any page exists: the popup's first request can precede
    // its page/popup event and cannot be protected by a page-event route.
    await installIsolationGuards(context, forbidden);
    const opener = await context.newPage();
    await opener.goto(`${baseURL}/popup.html?${new URLSearchParams({ kind, target })}`);
    const navigationFailure = kind === "websocket" ? null :
      context.waitForEvent("requestfailed", {
        predicate: request => request.url() === target && request.isNavigationRequest(),
        timeout: 10_000,
      });
    const [popup, , failedRequest] = await Promise.all([
      context.waitForEvent("page", { timeout: 10_000 }),
      opener.getByRole("button", { name: "Open synthetic popup" }).click(),
      navigationFailure,
    ]);
    assert.notEqual(popup, opener, `${kind}: fault belongs to a new page`);
    assert.equal(await popup.opener(), opener, `${kind}: new page belongs to the fixture opener`);
    assert.equal(context.pages().length, 2, `${kind}: exactly one popup opened`);
    if (kind === "websocket") {
      await popup.waitForFunction(() => window.isolationResult?.settled, null, { timeout: 10_000 });
      assert.deepEqual(await popup.evaluate(() => window.isolationResult),
        { kind, target, attempts: 1, settled: true, outcome: "blocked" },
        `${engineName} popup-${kind}: native socket attempted once and closed without opening`);
    } else {
      assert.equal(failedRequest.frame().page(), popup, `${kind}: popup initial navigation failed`);
      assert.ok(failedRequest.failure(), `${kind}: native navigation was rejected`);
      assert.deepEqual(responses, [], `${kind}: forbidden navigation received no HTTP response`);
    }
    assert.deepEqual(forbidden, [target], `popup-${kind}: exact forbidden target recorded once`);
    assert.deepEqual(reachedForbidden, [], `popup-${kind}: no forbidden request reached a server`);
    assert.deepEqual(errors, [], `popup-${kind}: no unrelated browser errors`);
    assert.throws(() => assertNoForbiddenRequests(forbidden), {
      code: "ERR_ASSERTION", message: /No attempted API, external or websocket requests/,
    }, `popup-${kind}: normal navigation verdict must reject this attempt`);
    console.log(`PASS ${engineName} isolation-popup-${kind}: new page attempted, blocked, recorded, rejected; no server connection`);
  } finally {
    await context.close();
  }
}

async function checkWorkerFault(browser, engineName, kind, target) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const forbidden = [], errors = [], workers = [];
    await installIsolationGuards(context, forbidden);
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("worker", worker => workers.push(worker));
    await page.goto(`${baseURL}/worker.html?${new URLSearchParams({ kind, target })}`);
    await page.waitForFunction(() => window.isolationResult?.settled, null, { timeout: 10_000 });
    assert.equal(workers.length, 1, `${kind}: exactly one dedicated worker started`);
    assert.equal(new URL(workers[0].url()).origin, baseURL, `${kind}: worker script is fixture-local`);
    assert.equal(context.pages().length, 1, `${kind}: worker fault did not open another page`);
    assert.deepEqual(await page.evaluate(() => window.isolationResult), {
      kind, target, realm: "dedicated-worker", attempts: 1, settled: true,
      outcome: "blocked", errorName: "TypeError",
    }, `${engineName} worker-${kind}: native worker fetch attempted once and rejected`);
    assert.deepEqual(forbidden, [target], `worker-${kind}: exact forbidden target recorded once`);
    assert.deepEqual(reachedForbidden, [], `worker-${kind}: no forbidden request reached a server`);
    assert.deepEqual(errors, [], `worker-${kind}: no unrelated browser errors`);
    assert.throws(() => assertNoForbiddenRequests(forbidden), {
      code: "ERR_ASSERTION", message: /No attempted API, external or websocket requests/,
    }, `worker-${kind}: normal navigation verdict must reject this attempt`);
    console.log(`PASS ${engineName} isolation-worker-${kind}: dedicated worker attempted, blocked, recorded, rejected; no server connection`);
  } finally {
    await context.close();
  }
}
