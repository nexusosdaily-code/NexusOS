import assert from "node:assert/strict";
import { chromium } from "playwright-core";

// Run against the existing dev workflow. No auth bypass, DB, or live API calls.
// Clipboard + Ctrl+V exercises native maxLength; fill/dispatchEvent would not.
const baseURL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://127.0.0.1:5000";
const browser = await chromium.launch({
  executablePath: "/repl/tools/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
let passed = 0;

try {
  const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const errors = [];
  const writes = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => {
    const request = route.request();
    if (request.method() !== "GET") writes.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
    return route.fulfill({
      status: request.method() === "GET" ? 200 : 403,
      json: new URL(request.url()).pathname === "/api/auth/me" ? { user: null } : [],
    });
  });
  // The unrelated legacy Live Encode tab posts its default text after a
  // debounce on mount. Block it too, then measure only Unicode interactions.
  const initialEncode = page.waitForResponse(response =>
    new URL(response.url()).pathname === "/api/nexus/dev/encode" && response.request().method() === "POST");
  await page.goto(`${baseURL}/ce-code-writer`);
  const input = page.getByTestId("unicode-input");
  await input.waitFor({ timeout: 30_000 });
  assert.equal(await input.getAttribute("maxlength"), "512");
  const panel = page.getByRole("region", { name: "Multilingual coordinate encoding" });
  await initialEncode;
  assert.deepEqual(writes, [{
    path: "/api/nexus/dev/encode",
    body: { instruction: "Hello, universe. Every symbol is light.", label: "live_encode" },
  }], "Only the known legacy mount request may precede Unicode interactions");
  writes.length = 0;

  await input.evaluate(element => {
    window.unicodeInputEvents = [];
    for (const type of ["paste", "beforeinput", "input", "compositionstart", "compositionupdate", "compositionend"]) {
      element.addEventListener(type, event => window.unicodeInputEvents.push({
        type, trusted: event.isTrusted, inputType: event.inputType, composing: event.isComposing,
      }));
    }
  });

  const events = () => page.evaluate(() => window.unicodeInputEvents);
  async function seed(text, start = text.length, end = start) {
    // Only the starting fixture uses fill. Every tested insertion uses native input.
    await input.fill(text);
    await input.focus();
    await input.evaluate((element, [start, end]) => {
      element.setSelectionRange(start, end);
      window.unicodeInputEvents = [];
    }, [start, end]);
  }
  async function recover(expected) {
    assert.equal(await input.inputValue(), expected, "Accepted input must match exact UTF-16 sequence");
    assert.equal(expected.isWellFormed(), true, "No unpaired surrogate may be accepted");
    assert.ok(expected.length <= 512, "Committed preview stays within maxLength");
    await panel.getByTestId("unicode-load-payload").click();
    const payload = JSON.parse(await panel.getByTestId("unicode-payload").inputValue());
    assert.equal(payload.profile, "ce-utf8-coordinate-v1");
    // Independent byte oracle, not another call to the encoder under test.
    const bytes = [...new TextEncoder().encode(expected)];
    assert.deepEqual(payload.frames, bytes.map(byte => ({ wdm: byte & 127, oam: byte >>> 7, pol: "H" })));
    assert.equal(await panel.getByTestId("unicode-counts").textContent().then(text => text.trim()),
      `${[...expected].length} Unicode code points · ${bytes.length} UTF-8 coordinate frames`);
    await panel.getByTestId("unicode-decode").click();
    assert.equal(await panel.getByTestId("unicode-decoded").textContent(), expected,
      "Load/decode must preserve combining marks, BOM, bidi controls and logical order exactly");
    assert.equal(await panel.getByRole("alert").count(), 0);
  }
  async function paste({ name, before, clipboard, expected, selection }) {
    await seed(before, ...(selection ?? [before.length]));
    await page.evaluate(text => navigator.clipboard.writeText(text), clipboard);
    await input.press("Control+V");
    const observed = await events();
    assert.ok(observed.some(event => event.type === "paste" && event.trusted), "Real clipboard paste required");
    assert.ok(observed.some(event => event.type === "beforeinput" && event.trusted && event.inputType === "insertFromPaste"));
    if (before !== expected) {
      assert.ok(observed.some(event => event.type === "input" && event.trusted && event.inputType === "insertFromPaste"));
    }
    await recover(expected);
    console.log(`PASS paste: ${name} (${expected.length} units)`);
    passed++;
  }

  const mixed = "\uFEFFe\u0301 · \u2067עברית العربية\u2069 · 𓀀𝄞 · ";
  const mixedPrefix = mixed + "x".repeat(510 - mixed.length);
  for (const test of [
    { name: "two units free, supplementary fits, trailing BMP truncated", before: "a".repeat(510), clipboard: "𓀀Z", expected: "a".repeat(510) + "𓀀" },
    { name: "one unit free, supplementary rejected whole", before: "a".repeat(511), clipboard: "𓀀Z", expected: "a".repeat(511) },
    { name: "full preview, supplementary rejected", before: "a".repeat(512), clipboard: "𓀀", expected: "a".repeat(512) },
    { name: "BMP prefix fits but following surrogate pair does not", before: "a".repeat(510), clipboard: "B𓀀", expected: "a".repeat(510) + "B" },
    { name: "entire supplementary preview", before: "𓀀".repeat(255), clipboard: "𝄞𓀀", expected: "𓀀".repeat(255) + "𝄞" },
    { name: "selection replacement at full limit", before: "a".repeat(512), selection: [250, 252], clipboard: "𓀀Z", expected: "a".repeat(250) + "𓀀" + "a".repeat(260) },
    { name: "selected supplementary replaced without splitting", before: mixedPrefix + "𓀀", selection: [510, 512], clipboard: "𝄞Z", expected: mixedPrefix + "𝄞" },
    { name: "mixed combining and bidi text pasted across limit", before: "", clipboard: mixedPrefix + "𓀀Z", expected: mixedPrefix + "𓀀" },
    { name: "combining mark may be truncated, never silently normalised", before: mixed + "x".repeat(511 - mixed.length), clipboard: "e\u0301𓀀", expected: mixed + "x".repeat(511 - mixed.length) + "e" },
  ]) await paste(test);

  // Chromium's IME protocol drives its composition engine, not synthetic DOM
  // events. This is not an OS IME or a claim about Firefox/WebKit behavior.
  const session = await context.newCDPSession(page);
  for (const [units, accepted] of [[510, "𓀀"], [511, ""]]) {
    const before = mixed + "x".repeat(units - mixed.length);
    await seed(before);
    await session.send("Input.imeSetComposition", { text: "𓀀", selectionStart: 2, selectionEnd: 2 });
    assert.equal(await input.inputValue(), before + "𓀀");
    const observed = await events();
    for (const type of ["compositionstart", "compositionupdate", "input"]) {
      assert.ok(observed.some(event => event.type === type && event.trusted), `Native ${type} required`);
    }
    assert.ok(observed.some(event => event.type === "input" && event.composing));
    // Do not blur by clicking payload buttons until composition has committed.
    // Native pre-edit may temporarily exceed maxLength, but must be well-formed.
    assert.equal((await input.inputValue()).isWellFormed(), true);
    await session.send("Input.insertText", { text: "𓀀" });
    assert.ok((await events()).some(event => event.type === "compositionend"));
    await recover(before + accepted);
    console.log(`PASS composition: ${units} units before commit; ${accepted ? "pair accepted" : "pair rejected whole"}`);
    passed++;
  }
  await session.detach();
  assert.deepEqual(writes, [], "Unicode preview must not make state-changing API calls");
  assert.deepEqual(errors, [], "No browser page errors");
  console.log(`PASS ${passed} native-input cases on Chromium ${browser.version()}; no server writes`);
} finally {
  await browser.close();
}
