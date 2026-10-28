import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

// Browser-only fixtures: no sign-in, private accounts, live financial requests or DB.
const baseURL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://127.0.0.1:5000";
const browser = await chromium.launch({
  executablePath: "/repl/tools/bin/chromium", headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
await mkdir("generated-artifacts/browser-security", { recursive: true });
try {
  for (const [name, width, height] of [["desktop", 1365, 900], ["mobile", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const requests = [];
    const errors = [];
    let owner = true;
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const json = body => route.fulfill({ json: body });
      if (req.method() !== "GET") {
        if (path === "/api/app/security-fixture/run") {
          requests.push({ body: req.postDataJSON(), headers: req.headers() });
          return route.fulfill({ status: 403, json: { error: "Synthetic rejection; nothing executed" } });
        }
        return route.fulfill({ status: 403, json: { error: "All state-changing requests blocked by test" } });
      }
      if (path === "/api/auth/me") return json({ user: { id: "synthetic-owner", username: "security-test", role: "user" } });
      if (path === "/api/app/security-fixture") return json({
        id: "11111111-1111-4111-8111-111111111111", name: "Security Fixture",
        source_code: "INIT test\nSTORE marker safe\nHALT",
        can_execute: owner, contract_nxt_balance: "1.00000000", status: "deployed", app_slug: "security-fixture",
      });
      if (path.endsWith("/state")) return json({ state: [], contract_nxt_balance: "1.00000000" });
      return json([]);
    });
    await page.goto(`${baseURL}/app/security-fixture`, { waitUntil: "networkidle" });
    const execute = page.getByRole("button", { name: "Execute on Chain (owner only)", exact: true });
    await execute.waitFor({ state: "visible", timeout: 30_000 });
    assert.equal(await execute.isEnabled(), true);
    page.once("dialog", dialog => dialog.dismiss());
    await execute.click();
    assert.equal(requests.length, 0, "Cancel must not send an execution");
    page.once("dialog", dialog => dialog.accept());
    await execute.click();
    await page.getByText("Synthetic rejection; nothing executed", { exact: true }).waitFor();
    assert.equal(requests.length, 1);
    assert.match(requests[0].body.request_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.match(requests[0].headers["content-type"], /application\/json/);
    await page.screenshot({ path: `generated-artifacts/browser-security/${name}-owner.jpg`, fullPage: true });
    const box = await execute.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1, `${name}: security action must fit viewport`);
    owner = false;
    await page.reload({ waitUntil: "networkidle" });
    await execute.waitFor();
    assert.equal(await execute.isDisabled(), true, "Non-owner cannot click real execution");
    await page.getByTestId("tab-debug").click();
    assert.equal(requests.length, 1, "Debug does not execute a server action");
    assert.deepEqual(errors, []);
    console.log(`PASS ${name}: confirmation cancel/accept, UUID request, error visibility, non-owner disabled, local debug; fixture-only`);
    await context.close();
  }
} finally {
  await browser.close();
}
