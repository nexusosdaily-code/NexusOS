/**
 * Explicit opt-in browser integration with the real UI and BTC handler.
 * No application startup, live DB, real key, wallet or remote service.
 * Run after building: WNSP_BROWSER_SESSION_TEST=1 ...vitest run --project server <file>
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer, type Server } from "node:https";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { UNICODE_SCRIPT_EXAMPLES } from "../shared/unicode-script-examples";

const fixture = vi.hoisted(() => ({
  sessions: new Map<string, any>(), active: true,
  user: { id: "synthetic-founder", username: "Nexus", role: "admin", isActive: true },
}));
vi.mock("./db", () => { throw new Error("Real DB import forbidden in browser security fixture"); });
vi.mock("pg", () => ({ Pool: class { constructor() { throw new Error("Real DB connection forbidden"); } } }));
vi.mock("./storage", () => ({
  storage: {
    getUserByUsername: async (name: string) => name === "Nexus" ? { ...fixture.user, isActive: fixture.active } : undefined,
    getUser: async () => ({ ...fixture.user, isActive: fixture.active }),
    getWallet: async () => null,
    updateUserLastLogin: async () => {},
    createAuditLog: async () => {},
    createSession: async (userId: string, _ip: string, _ua: string, provenance: string) => {
      if (provenance !== "founder_btc") throw new Error("Only BTC provenance permitted");
      const { createFounderSessionToken } = await import("./founder-access");
      const token = createFounderSessionToken();
      const session = { id: token, userId, token, expiresAt: new Date(Date.now() + 60_000) };
      fixture.sessions.set(token, session);
      return session;
    },
    getSessionByToken: async (token: string) => {
      const session = fixture.sessions.get(token);
      return session && session.expiresAt > new Date() ? session : undefined;
    },
    deleteSession: async (id: string) => fixture.sessions.delete(id),
  },
}));
import { founderBtcLoginHandler } from "./founder-access";
import { authenticate, logoutSessionHandler } from "./auth";
import { browserContentSecurityPolicy } from "./browser-policy";
import { browserSessionRequestGuard } from "./browser-session-policy";

describe.skipIf(process.env.WNSP_BROWSER_SESSION_TEST !== "1")("isolated authenticated browser", () => {
  let server: Server, browser: Browser, origin: string, directory: string;
  beforeAll(async () => {
    vi.stubEnv("BTC_INSCRIPTION_WALLET_WIF", "synthetic-btc-secret-not-a-real-key");
    vi.stubEnv("SESSION_SECRET", "synthetic-session-secret-not-a-real-credential");
    vi.stubEnv("NODE_ENV", "production");
    directory = mkdtempSync(join(tmpdir(), "wnsp-browser-session-"));
    // Ephemeral local TLS fixture; never a real site's certificate/private key.
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
      "-keyout", join(directory, "key.pem"), "-out", join(directory, "cert.pem"),
      "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });
    const app = express();
    app.use(express.json(), cookieParser());
    app.use(browserSessionRequestGuard);
    app.use((_req, res, next) => {
      res.setHeader("Content-Security-Policy", browserContentSecurityPolicy(true));
      next();
    });
    app.post("/api/auth/wif-login", founderBtcLoginHandler);
    app.get("/api/auth/me", authenticate, (req, res) => res.json({ user: req.user }));
    app.post("/api/auth/logout", authenticate, logoutSessionHandler);
    // Deny every other mutation, and do not proxy to any real application API.
    app.use("/api", (req, res) => {
      if (!["GET", "HEAD"].includes(req.method)) return res.status(403).json({ error: "Fixture blocks mutations" });
      res.json([]);
    });
    app.use(express.static(resolve("dist/public")));
    app.get("*", (_req, res) => res.sendFile(resolve("dist/public/index.html")));
    server = createServer({
      key: readFileSync(join(directory, "key.pem")),
      cert: readFileSync(join(directory, "cert.pem")),
    }, app);
    await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Fixture did not open a local socket");
    origin = `https://127.0.0.1:${address.port}`;
    browser = await chromium.launch({
      executablePath: "/repl/tools/bin/chromium", headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }, 30_000);
  afterAll(async () => {
    await browser?.close();
    if (server) {
      server.closeAllConnections();
      await new Promise<void>(done => server.close(() => done()));
    }
    if (directory) rmSync(directory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it.each([["desktop", 1365, 900], ["mobile", 390, 844]] as const)(
    "%s: sign-in, Python and Unicode pipelines, CSP, expiry and revocation",
    async (_name, width, height) => {
      fixture.sessions.clear(); fixture.active = true;
      // Only the ephemeral, self-signed LOCAL fixture skips certificate trust.
      const context = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true });
      try {
        await context.route("**/*", route => route.request().url().startsWith(origin + "/")
          ? route.continue() : route.abort());
        await context.addCookies([{ name: "auth_token", value: "attacker-controlled-session",
          url: origin, secure: true, httpOnly: true, sameSite: "Lax" }]);
        const page = await context.newPage();
        page.setDefaultTimeout(10_000);
        await page.goto(origin + "/auth", { waitUntil: "domcontentloaded" });
        await page.getByPlaceholder("Paste your BTC WIF key").waitFor();
        await page.evaluate(() => {
          localStorage.setItem("auth_token", "obsolete-synthetic-token");
          sessionStorage.setItem("auth_token", "obsolete-synthetic-token");
        });
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.getByPlaceholder("Paste your BTC WIF key").waitFor();
        expect(await page.evaluate(() => [localStorage.getItem("auth_token"), sessionStorage.getItem("auth_token")])).toEqual([null, null]);
        const identity = () => page.evaluate(async () => {
          const response = await fetch("/api/auth/me", { credentials: "include" });
          return { status: response.status, body: await response.json() };
        });
        expect((await identity()).status).toBe(401);
        await page.evaluate(() => sessionStorage.setItem("auth_redirect", "/ce-se-pipeline"));
        // The BTC form is expanded by default; use the actual input.
        await page.getByPlaceholder("Paste your BTC WIF key").fill("wrong-synthetic-key");
        const rejection = page.waitForResponse(r => r.url().endsWith("/api/auth/wif-login"));
        await page.getByRole("button", { name: /Sign in as Nexus/i }).last().click();
        expect((await rejection).status()).toBe(401);
        expect((await identity()).status).toBe(401);
        await page.getByPlaceholder("Paste your BTC WIF key").fill("synthetic-btc-secret-not-a-real-key");
        const success = page.waitForResponse(r => r.url().endsWith("/api/auth/wif-login"));
        await page.getByRole("button", { name: /Sign in as Nexus/i }).last().click();
        expect((await success).status()).toBe(200);
        await page.waitForURL("**/ce-se-pipeline");
        const authenticated = await identity();
        expect(authenticated.status).toBe(200);
        expect(authenticated.body.user.username).toBe("Nexus");
        const cookie = (await context.cookies()).find(c => c.name === "auth_token")!;
        expect(cookie.value).toMatch(/^fw1\./);
        expect(cookie.value).not.toBe("attacker-controlled-session");
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.secure).toBe(true);
        expect(cookie.sameSite).toBe("Lax");
        expect(await page.evaluate(() => document.cookie)).not.toContain("auth_token");
        expect(await page.evaluate(() => localStorage.getItem("auth_token"))).toBeNull();
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.getByTestId("code-input").waitFor();
        expect((await identity()).status).toBe(200);
        // Actual built pipeline, not intercepted output; same production CSP.
        const input = page.getByTestId("code-input");
        await input.fill("import os");
        await page.waitForFunction(() => document.querySelector('[data-testid="pipeline-error"]')?.textContent?.includes("Line 1"));
        expect(await page.getByTestId("btn-run-all").isDisabled()).toBe(true);
        expect(await page.getByTestId("python-output").count()).toBe(0);
        await input.fill("def add(a, b):\n    return a + b\nprint(add(3, 4))");
        await page.getByTestId("btn-compile").click();
        expect(await page.getByTestId("python-output").count()).toBe(0);
        await page.getByTestId("btn-execute").click();
        await page.waitForFunction(() => document.querySelector('[data-testid="python-output"]')?.textContent?.trim() === "7");
        expect((await page.getByTestId("python-output").innerText()).trim()).toBe("7");
        await input.fill('def choose(n):\n    if n < 0:\n        return "negative"\n    else:\n        if n == 0:\n            return "zero"\n        else:\n            return "positive"\nif False:\n    print(1 // 0)\nelse:\n    print(choose(-1), choose(0), choose(1))\nprint(2 + 3 >= 5)');
        expect(await page.getByTestId("python-output").count()).toBe(0);
        await page.getByTestId("btn-compile").click();
        await page.getByTestId("btn-execute").click();
        await page.waitForFunction(() => document.querySelector('[data-testid="python-output"]')?.textContent?.trim() === "negative zero positive\nTrue");
        expect((await page.getByTestId("python-output").innerText()).trim()).toBe("negative zero positive\nTrue");
        await input.fill('def mark(value):\n    print(value)\n    return value\ndef choose(a):\n    if a and not a < 0:\n        return a or missing()\n    return "fallback"\nprint(False and (1 // 0), "ready" or missing())\nprint(mark(0) or mark(4), mark(2) and mark(3))\nprint(choose(7), choose(0), not 1 == 2, True or False and False)');
        expect(await page.getByTestId("python-output").count()).toBe(0);
        await page.getByTestId("btn-compile").click();
        await page.getByTestId("btn-execute").click();
        await page.waitForFunction(() => document.querySelector('[data-testid="python-output"]')?.textContent?.trim() === "False ready\n0\n4\n2\n3\n4 3\n7 fallback True True");
        expect((await page.getByTestId("python-output").innerText()).trim()).toBe("False ready\n0\n4\n2\n3\n4 3\n7 fallback True True");
        await input.fill("print(True or window.location)");
        await page.waitForFunction(() => document.querySelector('[data-testid="pipeline-error"]')?.textContent?.includes("Line 1"));
        expect(await page.getByTestId("btn-run-all").isDisabled()).toBe(true);
        expect(await page.getByTestId("python-output").count()).toBe(0);
        await input.fill("print(True and (1 // 0))");
        await page.getByTestId("btn-run-all").click();
        await page.waitForFunction(() => document.querySelector('[data-testid="pipeline-error"]')?.textContent?.includes("Division by zero"));
        expect((await page.getByTestId("python-output").innerText()).trim()).toBe("(no printed output)");
        await input.fill('print("before failure")\nprint(1 // 0)\nprint("must not run")');
        await page.getByTestId("btn-run-all").click();
        await page.waitForFunction(() => document.querySelector('[data-testid="pipeline-error"]')?.textContent?.includes("Division by zero"));
        expect((await page.getByTestId("python-output").innerText()).trim()).toBe("before failure");
        expect(await page.getByText("Partial output before failure", { exact: false }).isVisible()).toBe(true);
        const elifFixtures = [
          'def choose(n):\n    if n < 0:\n        return "negative"\n    elif n == 0:\n        return "zero"\n    elif n == 1:\n        return "one"\n    else:\n        return "many"\nprint(choose(-1), choose(0), choose(1), choose(2))',
          'def check(n):\n    print("check", n)\n    return n\nif check(0):\n    missing()\nelif check(1):\n    if False:\n        missing()\n    elif True:\n        print("selected")\nelif 1 // 0:\n    missing()\nelse:\n    missing()\nprint("done")',
          'if False:\n    missing()\nelif None:\n    missing()\nelse:\n    print("fallback")\nif False:\n    missing()\nelif "":\n    missing()\nprint("no match")',
          'def choose(n):\n    if n < 0 and not n == -2:\n        return "negative"\n    elif n == 0 or n == -2:\n        return "special"\n    elif n and (True or missing()):\n        return "positive"\n    else:\n        return "fallback"\nprint(choose(-1), choose(-2), choose(0), choose(2))',
        ];
        for (const source of elifFixtures) {
          // Trusted constants only, never editor/user-provided programs.
          const expected = execFileSync("python", ["-I", "-c", source], {
            encoding: "utf8", timeout: 3000, maxBuffer: 100_000,
          }).trim();
          await input.fill(source);
          expect(await page.getByTestId("python-output").count()).toBe(0);
          expect(await page.getByTestId("btn-execute").isDisabled()).toBe(true);
          await page.getByTestId("btn-compile").click();
          expect(await page.getByTestId("python-output").count()).toBe(0);
          await page.getByTestId("btn-execute").click();
          await page.waitForFunction(text => document.querySelector('[data-testid="python-output"]')?.textContent?.trim() === text, expected);
          expect((await page.getByTestId("python-output").innerText()).trim()).toBe(expected);
        }
        await input.fill("if True:\n    print(1)\nelse:\n    print(2)\nelif True:\n    print(3)");
        await page.waitForFunction(() => document.querySelector('[data-testid="pipeline-error"]')?.textContent?.includes("Line 5"));
        expect(await page.getByTestId("btn-run-all").isDisabled()).toBe(true);
        expect(await page.getByTestId("python-output").count()).toBe(0);
        await input.fill("x = 9\ndef f():\n    if False:\n        print(1)\n    elif False:\n        x = 1\n    return x\nprint(f())");
        await page.getByTestId("btn-run-all").click();
        await page.waitForFunction(() => document.querySelector('[data-testid="pipeline-error"]')?.textContent?.includes("uninitialised variable"));
        expect((await page.getByTestId("python-output").innerText()).trim()).toBe("(no printed output)");
        expect(await page.getByText("Partial output before failure", { exact: false }).isVisible()).toBe(true);
        await input.fill("print(5 // 0)");
        await page.getByTestId("btn-run-all").click();
        await page.waitForFunction(() => document.querySelector('[data-testid="pipeline-error"]')?.textContent?.includes("Division by zero"));
        expect((await page.getByTestId("python-output").innerText()).trim()).toBe("(no printed output)");
        expect(await page.getByText("Partial output before failure", { exact: false }).isVisible()).toBe(true);
        await input.fill("print(-7 // 3, -7 % 3)");
        await page.getByTestId("btn-run-all").click();
        await page.waitForFunction(() => document.querySelector('[data-testid="python-output"]')?.textContent?.trim() === "-3 2");
        await page.getByRole("button", { name: "Reset", exact: true }).click();
        expect(await page.getByTestId("python-output").count()).toBe(0);
        expect(await page.getByTestId("btn-execute").isDisabled()).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.getByTestId("lang-javascript").click();
        expect(await page.getByText("Encoding preview only:", { exact: false }).isVisible()).toBe(true);
        expect(await page.getByTestId("python-output").count()).toBe(0);
        await page.goto(`${origin}/ce-code-writer`, { waitUntil: "networkidle" });
        for (const { label: name, text, context, linguisticSource } of UNICODE_SCRIPT_EXAMPLES) {
          await page.getByRole("button", { name, exact: true }).click();
          await page.getByTestId("unicode-load-payload").click();
          await page.getByTestId("unicode-decode").click();
          expect(await page.getByTestId("unicode-decoded").textContent()).toBe(text);
          expect(await page.getByTestId("unicode-script-context").textContent()).toContain(context);
          if (linguisticSource) {
            expect(await page.getByRole("link", { name: `Linguistic source: ${linguisticSource.label}` }).getAttribute("href")).toBe(linguisticSource.url);
          }
        }
        await page.getByTestId("unicode-payload").fill('{"profile":"unknown","frames":[]}');
        await page.getByTestId("unicode-decode").click();
        expect(await page.getByTestId("unicode-decoded").count()).toBe(0);
        expect(await page.getByTestId("unicode-error").textContent()).toContain("profile");
        await page.getByRole("button", { name: "Browse Unicode writing-system catalogue" }).click();
        const nameQuery = page.getByLabel("Search official character names or aliases");
        await nameQuery.fill("line feed");
        await page.getByRole("button", { name: "Search names", exact: true }).click();
        await page.getByRole("button", { name: "Inspect U+000A — <control>", exact: true }).click();
        expect(await page.getByTestId("unicode-point-details").textContent()).toContain("No Unicode character name");
        expect(await page.getByTestId("unicode-point-details").textContent()).toContain("LINE FEED");
        await nameQuery.fill("EGYPTIAN HIEROGLYPH A001");
        await page.getByRole("button", { name: "Search names", exact: true }).click();
        await page.getByRole("button", { name: "Inspect U+13000 — EGYPTIAN HIEROGLYPH A001", exact: true }).click();
        expect(await page.getByTestId("unicode-point-details").textContent()).toContain("EGYPTIAN HIEROGLYPH A001");
        const sequenceQuery = page.getByLabel("Search official named character sequences");
        await sequenceQuery.fill("LETTER");
        await page.getByRole("button", { name: "Search named sequences", exact: true }).click();
        expect(await page.getByTestId("unicode-sequence-results").getByRole("button").count()).toBe(64);
        const firstSequencePage = await page.getByTestId("unicode-sequence-results").textContent();
        await page.getByRole("button", { name: "Next named sequence results", exact: true }).click();
        expect(await page.getByTestId("unicode-sequence-results").textContent()).not.toBe(firstSequencePage);
        for (const [name, text, labels] of [
          ["KEYCAP DIGIT ONE", "1\uFE0F\u20E3", ["U+0031", "U+FE0F", "U+20E3"]],
          ["LATIN SMALL LETTER A WITH MACRON AND GRAVE", "\u0101\u0300", ["U+0101", "U+0300"]],
          ["ARABIC SEQUENCE NOON WITH KEHEH", "\u0646\u06A9", ["U+0646", "U+06A9"]],
        ] as const) {
          await sequenceQuery.fill(name);
          await page.getByRole("button", { name: "Search named sequences", exact: true }).click();
          expect(await page.getByRole("button", { name: "Previous named sequence results", exact: true }).isDisabled()).toBe(true);
          await page.getByRole("button", { name: `Inspect named sequence ${name}`, exact: true }).click();
          const sequenceDetails = page.getByTestId("unicode-sequence-details");
          const scalarRows = sequenceDetails.getByTestId("unicode-sequence-scalar");
          expect(await scalarRows.count()).toBe(labels.length);
          for (let index = 0; index < labels.length; index++) {
            expect(await scalarRows.nth(index).textContent()).toContain(labels[index]);
          }
          expect(await sequenceDetails.textContent()).toContain("DECODE ROUNDTRIP VERIFIED");
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          await page.getByRole("button", { name: "Replace preview with named sequence", exact: true }).click();
          expect(await page.getByTestId("unicode-input").inputValue()).toBe(text);
          await page.getByTestId("unicode-load-payload").click();
          await page.getByTestId("unicode-decode").click();
          expect(await page.getByTestId("unicode-decoded").textContent()).toBe(text);
        }
        await page.getByTestId("unicode-sequence-details").screenshot({
          path: resolve(`generated-artifacts/unicode-named-sequence-${_name}.png`),
        });
        const lookupPoint = async (value: string) => {
          await page.getByLabel("Code point lookup", { exact: true }).fill(value);
          await page.getByRole("button", { name: "Look up code point", exact: true }).click();
        };
        await page.getByLabel("Search blocks or writing systems").fill("Egyptian Hieroglyphs");
        await page.getByLabel("Unicode block", { exact: true }).selectOption("Egyptian Hieroglyphs");
        await page.getByRole("button", { name: "Inspect U+13000", exact: true }).click();
        const details = page.getByTestId("unicode-point-details");
        expect(await details.textContent()).toContain("Ψ(112,1,H)");
        expect(await details.textContent()).toContain("Ψ(19,1,H)");
        expect(await details.getByRole("heading").textContent()).toBe("U+13000");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        mkdirSync(resolve("generated-artifacts"), { recursive: true });
        await page.locator('section[aria-labelledby="unicode-catalogue-title"]').screenshot({
          path: resolve(`generated-artifacts/unicode-catalogue-${_name}.png`),
        });
        await page.getByRole("button", { name: "Next characters" }).click();
        expect(await page.getByRole("button", { name: "Inspect U+13000", exact: true }).count()).toBe(0);
        await lookupPoint("U+0301");
        expect(await details.textContent()).toContain("Inherited");
        await page.getByRole("button", { name: "Use symbol in preview" }).click();
        expect(await page.getByTestId("unicode-input").inputValue()).toBe("\u0301");
        expect(await page.getByTestId("unicode-decoded").count()).toBe(0);
        for (const [point, status] of [["0378", "unassigned"], ["E000", "private-use"], ["10FFFF", "noncharacter"]]) {
          await lookupPoint(point);
          expect(await details.textContent()).toContain(`${status} · outside the assigned-character catalogue`);
          expect(await details.textContent()).toContain("DECODE ROUNDTRIP VERIFIED");
          expect(await page.getByRole("button", { name: "Use symbol in preview" }).count()).toBe(0);
        }
        await lookupPoint("D800");
        expect(await page.getByTestId("unicode-lookup-error").textContent()).toContain("Surrogates");
        expect(await details.count()).toBe(0);
        const unicodeText = "שָׁe\u0301𓀀";
        await page.getByTestId("unicode-input").fill(unicodeText);
        await page.getByTestId("unicode-load-payload").click();
        await page.getByTestId("unicode-decode").click();
        expect(await page.getByTestId("unicode-decoded").textContent()).toBe(unicodeText);
        expect(await page.getByRole("table").locator("tbody tr td:nth-child(2)").allTextContents()).toEqual([
          "U+05E9", "U+05B8", "U+05C1", "U+0065", "U+0301", "U+13000",
        ]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        // Start a normal page task; debugger evaluation itself can bypass CSP.
        await page.evaluate(() => {
          (window as any).__inlineRan = false;
          setTimeout(() => {
            const script = document.createElement("script");
            script.textContent = "window.__inlineRan=true";
            document.head.appendChild(script);
            script.remove();
            const button = document.createElement("button");
            button.setAttribute("onclick", "window.__inlineRan=true");
            document.body.appendChild(button); button.click(); button.remove();
            (window as any).__probeFinished = true;
          }, 0);
        });
        await page.waitForFunction(() => (window as any).__probeFinished);
        expect(await page.evaluate(() => (window as any).__inlineRan)).toBe(false);
        fixture.active = false;
        expect((await identity()).status).toBe(401);
        fixture.active = true;
        fixture.sessions.get(cookie.value).expiresAt = new Date(0);
        expect((await identity()).status).toBe(401);
        fixture.sessions.get(cookie.value).expiresAt = new Date(Date.now() + 60_000);
        expect((await identity()).status).toBe(200);
        fixture.sessions.clear();
        expect((await identity()).status).toBe(401);
        // Reauthenticate using only the synthetic secret, then exercise the real
        // logout handler. A copied old cookie must no longer authenticate.
        const secondLogin = await page.evaluate(async () => {
          const response = await fetch("/api/auth/wif-login", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wifKey: "synthetic-btc-secret-not-a-real-key" }),
          });
          return { status: response.status, body: await response.json() };
        });
        expect(secondLogin.status).toBe(200);
        expect(secondLogin.body).not.toHaveProperty("token");
        const secondCookie = (await context.cookies()).find(c => c.name === "auth_token")!;
        const logoutStatus = await page.evaluate(async () => (await fetch("/api/auth/logout", { method: "POST" })).status);
        expect(logoutStatus).toBe(200);
        expect((await context.cookies()).some(c => c.name === "auth_token")).toBe(false);
        expect((await identity()).status).toBe(401);
        await context.addCookies([secondCookie]);
        expect((await identity()).status).toBe(401);
      } finally {
        fixture.active = true;
        await context.close();
      }
    }, 45_000,
  );
});
