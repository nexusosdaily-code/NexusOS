import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium, firefox, webkit } from "playwright-core";
import { installIsolationGuards, assertNoForbiddenRequests, checkIsolationFaults } from "./unicode-copy-isolation.mjs";

// Defaults to every engine: a missing browser is a failure, never a skipped check.
// Install matching engines with: node node_modules/playwright-core/cli.js install firefox webkit
const engines = { chromium, firefox, webkit };
const isolationOnly = process.argv.includes("--isolation-only");
const requestedEngines = process.argv.slice(2).filter(arg => arg !== "--isolation-only");
const engineNames = requestedEngines.length ? requestedEngines : Object.keys(engines);
for (const name of engineNames) assert.ok(engines[name], `Unknown browser engine: ${name}`);

// Frontend-only dev workflow; the fixture mounts the real panel without the
// application shell, authentication, database, or any external services.
const baseURL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://127.0.0.1:5000";
const fixturePath = "/__unicode-copy-fixture";
// Use Vite's resolved URL (including its cache version) so the fixture and
// component share one React instance even when the Vite root is client/.
async function createCopyFixture() {
const moduleSource = await fetch(`${baseURL}/src/components/unicode-coordinate-panel.tsx`, { redirect: "error" })
  .then(response => {
    assert.ok(response.ok, "Start the frontend-only Vite workflow (npm run dev:client)");
    return response.text();
  });
const reactURL = moduleSource.match(/from "([^"]+\/deps\/react\.js[^"]*)"/)?.[1];
assert.ok(reactURL, "Vite must provide a resolved React module URL");
const reactDOMURL = reactURL.replace("/react.js", "/react-dom_client.js");
return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;background:#020617;color:#e2e8f0}</style></head>
<body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
const {default: React} = await import(${JSON.stringify(reactURL)});
const {default: ReactDOM} = await import(${JSON.stringify(reactDOMURL)});
const {UnicodeCoordinatePanel} = await import('/src/components/unicode-coordinate-panel.tsx');
await import('/src/index.css');
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(UnicodeCoordinatePanel));
</script></body></html>`;
}
const fixture = isolationOnly ? null : await createCopyFixture();

async function checkEngine(engineName) {
const realClipboard = engineName === "chromium";
const browser = await engines[engineName].launch({
  headless: true,
  ...(realClipboard ? {
    ...(existsSync("/repl/tools/bin/chromium") ? { executablePath: "/repl/tools/bin/chromium" } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  } : {}),
});
try {
  await checkIsolationFaults(browser, engineName);
  if (isolationOnly) return;
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      // Playwright Firefox does not implement isMobile. Its narrow check uses
      // a touch-enabled desktop engine, not a Firefox Android/iOS simulation.
      ...(engineName !== "firefox" ? { isMobile: mobile } : {}),
      hasTouch: mobile,
      serviceWorkers: "block",
      // Only this local fixture: Firefox's bundled trust store may not know
      // the development proxy certificate. No application TLS policy changes.
      ignoreHTTPSErrors: true,
      ...(realClipboard ? { permissions: ["clipboard-read", "clipboard-write"] } : {}),
    });
    // Firefox/WebKit clipboard permissions differ by platform. Stub only this
    // boundary; selection, focus, layout and input gestures use the real engine.
    await context.addInitScript(({ realClipboard }) => {
      const nativeClipboard = navigator.clipboard;
      window.fixtureNativeClipboard = nativeClipboard;
      window.fixtureClipboardMode = "success";
      window.fixtureCopyAttempts = 0;
      window.fixturePendingCopies = [];
      window.fixtureSettleCopy = (index, outcome) => {
        const attempt = window.fixturePendingCopies[index];
        if (!attempt || attempt.settled) throw new Error("Missing or already settled clipboard attempt");
        attempt.settled = true;
        if (outcome === "resolve") attempt.resolve();
        else if (outcome === "reject") attempt.reject(new DOMException("Delayed fixture denial", "NotAllowedError"));
        else throw new Error("Unknown clipboard outcome");
      };
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        readText: () => realClipboard ? nativeClipboard.readText() : Promise.resolve(window.fixtureCopiedText),
        writeText: text => {
          window.fixtureCopyAttempts++;
          // Deliberately controlled even in Chromium: native clipboard timing
          // cannot reliably create overlapping, out-of-order promises.
          if (window.fixtureClipboardMode === "pending") {
            return new Promise((resolve, reject) => {
              window.fixturePendingCopies.push({ text, resolve, reject, settled: false });
            });
          }
          if (window.fixtureClipboardMode === "denied") {
            return Promise.reject(new DOMException("Fixture denial", "NotAllowedError"));
          }
          window.fixtureCopiedText = text;
          return realClipboard ? nativeClipboard.writeText(text) : Promise.resolve();
        },
      } });
      window.fixtureClipboard = navigator.clipboard;
    }, { realClipboard });
    const page = await context.newPage();
    const errors = [], apiCalls = [], externalCalls = [];
    page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
    page.on("console", message => {
      if (message.type() === "error") console.error(`${engineName}: ${message.text()}`);
    });
    page.on("requestfailed", request => console.error(`${engineName}: ${request.url()} ${request.failure()?.errorText}`));
    await installIsolationGuards(context, {
      baseURL, fixturePath, fixture, apiCalls, externalCalls,
    });
    await page.goto(`${baseURL}${fixturePath}`);
    const input = page.getByTestId("unicode-input");
    await input.waitFor();
    const preview = "שָׁe\u0301𓀀𓀀";
    await input.fill(preview);
    await page.getByTestId("unicode-load-payload").click();
    await page.getByTestId("unicode-decode").click();
    const payload = await page.getByTestId("unicode-payload").inputValue();
    const wholeCopy = page.getByRole("button", { name: "Copy whole-preview reference" });
    const expectedFrames = text => [...new TextEncoder().encode(text)]
      .map(byte => ({ wdm: byte & 127, oam: byte >>> 7, pol: "H" }));
    async function copyWhole() {
      await wholeCopy.scrollIntoViewIfNeeded();
      if (mobile) await wholeCopy.tap(); else await wholeCopy.click();
    }
    for (const text of [
      "\uFEFF" + "A".repeat(33) + "e\u0301\u2067שָׁ العربية\u2069𓀀𓀀𝄞",
      "\0\uE000\u0378\u{10FFFF}",
      "𓀀".repeat(256),
      "",
    ]) {
      // Clear first: native replacement of a nonempty maxLength textarea can
      // truncate a supplementary fill before the old selection is removed.
      await input.fill("");
      if (text.includes("\0")) {
        // Firefox's native fill strips NUL. This is an export test, not an
        // input-boundary test: seed the exact value through the DOM input event.
        await input.evaluate((element, value) => {
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(element, value);
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }, text);
      } else {
        await input.fill(text);
      }
      assert.equal((await input.inputValue()).length, text.length, "Fixture must contain the full test sequence");
      await page.waitForFunction(() => ![...document.querySelectorAll("button")]
        .find(button => button.textContent.trim() === "Copy whole-preview reference").disabled);
      await copyWhole();
      await page.getByText("Whole-preview reference copied.", { exact: true }).waitFor();
      const reference = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
      assert.equal(reference.unicodeVersion, "17.0.0");
      assert.equal(reference.unicodeSource, "https://www.unicode.org/Public/17.0.0/ucd/");
      assert.equal(reference.text, text);
      assert.deepEqual(reference.scalars.map(scalar => scalar.character), [...text]);
      assert.deepEqual(reference.scalars.map(scalar => scalar.index), [...text].map((_, index) => index + 1));
      assert.deepEqual(reference.scalars.flatMap(scalar => scalar.frames), expectedFrames(text));
      assert.deepEqual(reference.payload, { profile: "ce-utf8-coordinate-v1", frames: expectedFrames(text) });
      for (const scalar of reference.scalars) {
        assert.deepEqual(scalar.frames, expectedFrames(scalar.character));
        assert.equal(scalar.codePoint, `U+${scalar.character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`);
        assert.ok(["generalCategory", "script", "block", "assignmentStatus", "officialName", "aliases", "controlLabel"]
          .every(key => Object.hasOwn(scalar, key)));
      }
      if (text.startsWith("\0")) {
        assert.deepEqual(reference.scalars.map(scalar => scalar.officialName), [null, null, null, null]);
        assert.deepEqual(reference.scalars.map(scalar => scalar.assignmentStatus),
          ["assigned", "private-use", "unassigned", "noncharacter"]);
      }
      assert.equal(await page.getByTestId("unicode-payload").inputValue(), payload);
    }
    await input.fill(preview);
    await page.evaluate(() => {
      window.fixtureWholeClipboard = navigator.clipboard;
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        writeText: () => Promise.reject(new DOMException("Fixture denial", "NotAllowedError")),
      } });
    });
    await copyWhole();
    await page.getByRole("alert").filter({ hasText: "Could not copy whole-preview reference" }).waitFor();
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
    await copyWhole();
    await page.getByRole("alert").filter({ hasText: "Could not copy whole-preview reference" }).waitFor();
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: window.fixtureWholeClipboard }));
    await copyWhole();
    await page.getByText("Whole-preview reference copied.", { exact: true }).waitFor();
    const wholeBox = await wholeCopy.boundingBox();
    assert.ok(wholeBox.x >= 0 && wholeBox.x + wholeBox.width <= page.viewportSize().width);
    await page.getByTestId("unicode-decode").click();
    await page.getByRole("button", { name: "Browse Unicode writing-system catalogue" }).click();
    const copy = page.getByRole("button", { name: "Copy character details" });
    async function inspect(point) {
      await page.getByLabel("Code point lookup").fill(point);
      await page.getByRole("button", { name: "Look up code point" }).click();
      await copy.waitFor();
      await page.waitForFunction(() => ![...document.querySelectorAll("button")]
        .find(button => button.textContent.trim() === "Copy character details").disabled);
    }
    async function activateCopy() {
      await copy.scrollIntoViewIfNeeded();
      if (mobile) await copy.tap(); else await copy.click();
    }
    const references = new Map();
    for (const [point, name, status] of [
      ["13000", "EGYPTIAN HIEROGLYPH A001", "assigned"],
      ["0301", "COMBINING ACUTE ACCENT", "assigned"],
      ["FEFF", "ZERO WIDTH NO-BREAK SPACE", "assigned"],
      ["0000", "No Unicode character name", "assigned"],
      ["E000", "No Unicode character name", "private-use"],
      ["0378", "No Unicode character name", "unassigned"],
      ["10FFFF", "No Unicode character name", "noncharacter"],
    ]) {
      await inspect(point);
      await activateCopy();
      await page.getByText(`Character details copied for U+${point}.`, { exact: true }).waitFor();
      const text = realClipboard
        ? await page.evaluate(() => navigator.clipboard.readText())
        : await page.evaluate(() => window.fixtureCopiedText);
      references.set(point, text);
      assert.ok(text.startsWith(`Unicode 17.0.0\nCode point: U+${point}\nOfficial name: ${name}\n`));
      assert.ok(text.includes(`Assignment status: ${status}`));
      const visibleFrames = await page.getByTestId("unicode-point-details")
        .locator("p").allTextContents().then(lines => lines.filter(line => /^\d+\. Ψ/.test(line)));
      assert.ok(text.includes(visibleFrames.join("\n")), "Copy matches visible coordinate frames in order");
      if (point === "13000") assert.deepEqual(visibleFrames, [
        "1. Ψ(112,1,H) · 730 nm", "2. Ψ(19,1,H) · 439.375 nm",
        "3. Ψ(0,1,H) · 380 nm", "4. Ψ(0,1,H) · 380 nm",
      ]);
      if (point === "0000") {
        assert.ok(text.includes("- NULL (control)\n- NUL (abbreviation)"));
        assert.ok(text.includes("Control label: <control> (not a character name)"));
      }
      if (point === "FEFF") assert.ok(text.includes("- BYTE ORDER MARK (alternate)\n- BOM (abbreviation)"));
    }
    const manual = page.getByLabel("Character details for manual copying", { exact: true });
    const select = page.getByRole("button", { name: "Select reference text" });
    async function assertManualSelection(expected) {
      assert.equal(await manual.inputValue(), expected, "Manual reference equals successful clipboard output exactly");
      assert.equal(await manual.evaluate(element => element.tagName), "TEXTAREA");
      assert.equal(await manual.evaluate(element => element.readOnly), true);
      const before = await page.evaluate(() => window.fixtureCopyAttempts);
      await select.scrollIntoViewIfNeeded();
      if (mobile) await select.tap(); else await select.click();
      assert.deepEqual(await manual.evaluate(element => ({
        start: element.selectionStart, end: element.selectionEnd,
        selected: element.value.slice(element.selectionStart, element.selectionEnd),
        focused: document.activeElement === element,
      })), { start: 0, end: expected.length, selected: expected, focused: true });
      assert.equal(await page.evaluate(() => window.fixtureCopyAttempts), before, "Selection does not access the clipboard");
      for (const element of [manual, select]) {
        const bounds = await element.boundingBox();
        assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width,
          "Manual reference and select action fit viewport");
      }
    }
    const copyStatus = page.locator("#unicode-copy-status");
    async function assertPreviewIntact() {
      assert.equal(await input.inputValue(), preview, "Delayed copy leaves preview unchanged");
      assert.equal(await page.getByTestId("unicode-payload").inputValue(), payload, "Delayed copy leaves payload unchanged");
      assert.equal(await page.getByTestId("unicode-decoded").textContent(), preview, "Delayed copy leaves decode unchanged");
    }
    async function beginDelayedCopy(point) {
      await inspect(point);
      const index = await page.evaluate(() => window.fixturePendingCopies.length);
      const attempts = await page.evaluate(() => window.fixtureCopyAttempts);
      await activateCopy();
      await page.waitForFunction(index => window.fixturePendingCopies.length === index + 1, index);
      assert.equal(await page.evaluate(() => window.fixtureCopyAttempts), attempts + 1);
      assert.equal(await page.evaluate(index => window.fixturePendingCopies[index].text, index), references.get(point),
        "Pending attempt holds the exact reference for its original character");
      assert.equal(await copyStatus.textContent(), "Copying character details…");
      assert.equal(await copy.isDisabled(), true, "Copy is disabled while its current attempt is pending");
      assert.equal(await manual.count(), 0);
      return index;
    }
    async function settleDelayedCopy(index, outcome) {
      await page.evaluate(({ index, outcome }) => window.fixtureSettleCopy(index, outcome), { index, outcome });
      // A separate engine task and two animation frames let promise handlers
      // and React commits run before negative assertions; no arbitrary sleep.
      await page.evaluate(() => new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    async function assertCurrentResult(outcome) {
      assert.equal(await copy.isEnabled(), true);
      if (outcome === "resolve") {
        assert.equal(await copyStatus.textContent(), "Character details copied for U+0301.");
        assert.equal(await copyStatus.getAttribute("role"), "status");
        assert.equal(await manual.count(), 0, "Old failure cannot expose a manual reference after current success");
      } else {
        assert.equal(await copyStatus.getAttribute("role"), "alert");
        assert.match(await copyStatus.textContent(), /^Could not copy character details\./);
        await assertManualSelection(references.get("0301"));
      }
      await assertPreviewIntact();
    }
    await page.evaluate(() => { window.fixtureClipboardMode = "pending"; });
    // Inspection alone invalidates a pending attempt, even without a new copy.
    for (const oldOutcome of ["resolve", "reject"]) {
      const old = await beginDelayedCopy("13000");
      await inspect("0301");
      const inspected = await page.getByTestId("unicode-point-details").textContent();
      const idleStatus = await copyStatus.textContent();
      await settleDelayedCopy(old, oldOutcome);
      assert.equal(await copyStatus.textContent(), idleStatus, "Old completion cannot report a result for the newly inspected character");
      assert.equal(await copy.isEnabled(), true);
      assert.equal(await manual.count(), 0, "Old rejection cannot expose stale manual reference text");
      assert.equal(await page.getByTestId("unicode-point-details").textContent(), inspected, "Inspection remains on the new character");
      await assertPreviewIntact();
    }
    // Both promise outcomes, both current results, and both settlement orders.
    // In particular, the old attempt must not end a newer pending copy or
    // overwrite a newer success/error after that copy has already completed.
    for (const oldOutcome of ["resolve", "reject"]) {
      for (const currentOutcome of ["resolve", "reject"]) {
        for (const order of ["old-first", "current-first"]) {
          const old = await beginDelayedCopy("13000");
          const current = await beginDelayedCopy("0301");
          const pendingDetails = await page.getByTestId("unicode-point-details").textContent();
          if (order === "old-first") {
            await settleDelayedCopy(old, oldOutcome);
            assert.equal(await copyStatus.textContent(), "Copying character details…", "Old completion cannot replace current pending status");
            assert.equal(await copy.isDisabled(), true);
            assert.equal(await manual.count(), 0);
            assert.equal(await page.getByTestId("unicode-point-details").textContent(), pendingDetails);
            await assertPreviewIntact();
            await settleDelayedCopy(current, currentOutcome);
            await assertCurrentResult(currentOutcome);
          } else {
            await settleDelayedCopy(current, currentOutcome);
            await assertCurrentResult(currentOutcome);
            const currentDetails = await page.getByTestId("unicode-point-details").textContent();
            const selection = currentOutcome === "reject" ? await manual.evaluate(element => ({
              start: element.selectionStart, end: element.selectionEnd, focused: document.activeElement === element,
            })) : null;
            await settleDelayedCopy(old, oldOutcome);
            assert.equal(await page.getByTestId("unicode-point-details").textContent(), currentDetails,
              "Old completion cannot replace current success/error or selected character");
            if (selection) assert.deepEqual(await manual.evaluate(element => ({
              start: element.selectionStart, end: element.selectionEnd, focused: document.activeElement === element,
            })), selection, "Old completion preserves the current manual text selection and focus");
            await assertCurrentResult(currentOutcome);
          }
        }
      }
    }
    assert.equal(await page.evaluate(() => window.fixturePendingCopies.filter(attempt => !attempt.settled).length), 0,
      "Every controlled clipboard promise was settled");
    await page.evaluate(() => { window.fixtureClipboardMode = "denied"; });
    for (const [point, expected] of references) {
      await inspect(point);
      assert.equal(await manual.count(), 0, "Inspection clears stale manual references");
      const before = await page.evaluate(() => window.fixtureCopyAttempts ?? 0);
      await activateCopy();
      await page.getByRole("alert").filter({ hasText: "Could not copy character details" }).waitFor();
      if (realClipboard && !mobile) {
        // Seed through the saved real API, not the component's denied writeText.
        // A stale clipboard must not make a no-op native Copy look successful.
        await page.evaluate(() => window.fixtureNativeClipboard.writeText("native-copy sentinel"));
      }
      await assertManualSelection(expected);
      assert.equal(await page.evaluate(() => window.fixtureCopyAttempts), before + 1, "Selection does not access the clipboard");
      if (realClipboard && !mobile) {
        // Exercise the browser's default Copy action with automatic writes still
        // denied. ControlOrMeta uses Command on macOS and Control elsewhere.
        await page.keyboard.press("ControlOrMeta+c");
        assert.equal(await page.evaluate(() => window.fixtureNativeClipboard.readText()), expected,
          `Native Copy copies the entire manual reference for U+${point}`);
        assert.equal(await page.evaluate(() => window.fixtureCopyAttempts), before + 1,
          "Native Copy does not invoke automatic writeText");
        assert.equal(await input.inputValue(), preview, "Native Copy leaves preview unchanged");
        assert.equal(await page.getByTestId("unicode-payload").inputValue(), payload, "Native Copy leaves payload unchanged");
        assert.equal(await page.getByTestId("unicode-decoded").textContent(), preview, "Native Copy leaves decode unchanged");
      }
    }
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
    for (const [point, expected] of references) {
      await inspect(point);
      assert.equal(await manual.count(), 0, "Inspection clears stale manual references");
      await activateCopy();
      await page.getByRole("alert").filter({ hasText: "Could not copy character details" }).waitFor();
      await assertManualSelection(expected);
    }
    // Retry both failure modes, checking the complete written reference as well
    // as the status. The existing manual textarea must disappear after success.
    for (const mode of ["denied", "unavailable"]) {
      await page.evaluate(mode => {
        window.fixtureClipboardMode = mode === "denied" ? "denied" : "success";
        Object.defineProperty(navigator, "clipboard", {
          configurable: true, value: mode === "unavailable" ? undefined : window.fixtureClipboard,
        });
      }, mode);
      await activateCopy();
      await page.getByRole("alert").filter({ hasText: "Could not copy character details" }).waitFor();
      await assertManualSelection(references.get("10FFFF"));
      await page.evaluate(() => {
        window.fixtureClipboardMode = "success";
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: window.fixtureClipboard });
      });
      await activateCopy();
      await page.getByText("Character details copied for U+10FFFF.", { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.fixtureCopiedText), references.get("10FFFF"), "Retry writes the exact reference");
      if (realClipboard) assert.equal(await page.evaluate(() => navigator.clipboard.readText()), references.get("10FFFF"));
      assert.equal(await manual.count(), 0, "Successful retry hides the manual fallback");
    }
    assert.equal(await input.inputValue(), preview);
    assert.equal(await page.getByTestId("unicode-payload").inputValue(), payload);
    assert.equal(await page.getByTestId("unicode-decoded").textContent(), preview);
    const box = await copy.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= page.viewportSize().width, "Copy action fits viewport");
    assertNoForbiddenRequests({ apiCalls, externalCalls });
    assert.deepEqual(errors, []);
    console.log(`PASS ${engineName} ${mobile ? "narrow touch emulation" : "desktop"}: ${realClipboard ? "real clipboard" : "controlled clipboard boundary"}${realClipboard && !mobile ? " and native keyboard Copy" : ""}, controlled delayed clipboard resolve/reject in both settlement orders, preserved current pending/success/error and manual selection, whole-preview and character references, ordered repeated scalars, bidi, combining marks, full/empty preview, read-only focus/full selection, identical references, exact frames, typed aliases, unnamed points, denial, unavailable API, retry, viewport fit, unchanged preview/payload/decode, no API/external requests`);
    await context.close();
  }
  console.log(`${engineName} ${browser.version()}; Linux engine testing, not Safari.app or a real iOS/Android device. Firefox narrow touch uses no isMobile emulation.`);
} finally {
  await browser.close();
}
}

for (const engineName of engineNames) await checkEngine(engineName);
