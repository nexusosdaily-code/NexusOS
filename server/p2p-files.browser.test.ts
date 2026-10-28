import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import { build } from "esbuild";
import { chromium, type Browser } from "playwright-core";
import { SessionSockets } from "./session-sockets";
import { registerP2PFileChannel } from "./p2p-file-channel";

describe.skipIf(process.env.WNSP_P2P_BROWSER_TEST !== "1")("isolated real WebRTC UI", () => {
  let browser: Browser, server: Server, registry: SessionSockets;
  let channel: ReturnType<typeof registerP2PFileChannel>, origin: string;
  const muted = new Map<string, boolean>();
  const records = ["a", "b", "c"].map(id => ({ id, userId: id, expiresAt: new Date(Date.now() + 600_000) }));
  const address = (id: string) => `wnsp://Ψ(12,3,H)/${id}`;
  beforeAll(async () => {
    // Bundle the actual component, hook and byte-transfer engine. Only the auth
    // provider is replaced, in this ephemeral fixture; no app bypass is added.
    const bundle = await build({
      stdin: { contents: `import React from "react"; import {createRoot} from "react-dom/client";
        import Panel from ${JSON.stringify(resolve("client/src/components/p2p-file-exchange.tsx"))};
        createRoot(document.getElementById("root")).render(React.createElement(Panel));`,
        resolveDir: process.cwd(), loader: "tsx" },
      bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
      alias: { "@": resolve("client/src"), "@shared": resolve("shared") },
      plugins: [{ name: "synthetic-auth-only", setup(plugin) {
        plugin.onResolve({ filter: /use-auth$/ }, () => ({ path: "synthetic-auth", namespace: "fixture" }));
        plugin.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents:
          `export const useAuth=()=>({user:{id:window.fixtureUser},isAuthenticated:true,isLoading:false});`, loader: "js" }));
      } }],
    });
    const app = express(); app.use(express.json(), cookieParser());
    app.get("/fixture/:id", (req, res) => {
      if (!["a", "b", "c"].includes(req.params.id)) { res.sendStatus(404); return; }
      res.cookie("auth_token", req.params.id, { httpOnly: true, sameSite: "lax" });
      res.send(`<html><body style="background:#0f172a;color:white"><div id="root"></div>
        <script>window.fixtureUser=${JSON.stringify(req.params.id)}</script><script src="/fixture.js"></script></body></html>`);
    });
    app.get("/fixture.js", (_req, res) => res.type("application/javascript").send(bundle.outputFiles[0].text));
    app.put("/api/p2p/files/settings", (req, res) => {
      const id = req.cookies.auth_token;
      muted.set(id, req.body.muted);
      channel.settingsChanged(id, req.body.muted);
      res.json({ muted: req.body.muted });
    });
    server = createServer(app);
    registry = new SessionSockets(async ids => records.filter(row => ids.includes(row.id)));
    channel = registerP2PFileChannel(server, registry, {
      session: async token => records.find(row => row.id === token),
      settings: async id => ({ address: address(id), muted: muted.get(id) ?? false }),
      resolve: async value => {
        const row = records.find(row => address(row.id) === value);
        if (!row) throw new Error("Unknown address");
        return { userId: row.id, address: value };
      },
    });
    await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
    origin = `http://127.0.0.1:${(server.address() as any).port}`;
    browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  }, 30_000);
  afterAll(async () => {
    await browser?.close(); registry?.dispose(); channel?.close();
    if (server) {
      for (const ws of channel.wss.clients) ws.terminate();
      server.closeAllConnections();
      await new Promise<void>(done => server.close(() => done()));
    }
  });
  it("transfers an 8 MiB MP4-named binary file, verifies exact downloaded bytes, then tests broadcast mute", async () => {
    const senderContext = await browser.newContext();
    const receiverContext = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const thirdContext = await browser.newContext();
    const sender = await senderContext.newPage(), receiver = await receiverContext.newPage(), third = await thirdContext.newPage();
    await Promise.all([sender.goto(origin + "/fixture/a"), receiver.goto(origin + "/fixture/b"), third.goto(origin + "/fixture/c")]);
    const bytes = Buffer.alloc(8 * 1024 * 1024);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 17) % 256;
    await sender.getByTestId("p2p-file-input").setInputFiles({ name: "synthetic-video.mp4", mimeType: "video/mp4", buffer: bytes });
    await sender.getByTestId("p2p-recipient").fill(address("b"));
    await sender.waitForSelector('[data-testid="p2p-send"]:not([disabled])');
    await sender.getByTestId("p2p-send").click();
    await receiver.getByTestId("p2p-receive-tab").click();
    await receiver.getByRole("button", { name: /^Accept/ }).click();
    await receiver.getByRole("link", { name: "Download received file" }).waitFor({ timeout: 60_000 });
    await sender.getByText("Receiver confirmed completion", { exact: true }).waitFor({ timeout: 10_000 });
    const downloaded = receiver.waitForEvent("download");
    await receiver.getByRole("link", { name: "Download received file" }).click();
    const download = await downloaded;
    const path = await download.path();
    expect(path).not.toBeNull();
    const actual = await readFile(path!);
    expect(actual.length).toBe(bytes.length);
    expect(createHash("sha256").update(actual).digest("hex")).toBe(createHash("sha256").update(bytes).digest("hex"));

    await receiver.getByTestId("p2p-mute").click();
    await receiver.waitForFunction(() => document.querySelector('[data-testid="p2p-mute"]')?.getAttribute("aria-checked") === "false");
    await sender.getByTestId("p2p-file-input").setInputFiles({ name: "music.any-format", mimeType: "", buffer: Buffer.from("broadcast sample") });
    await sender.getByTestId("p2p-broadcast-mode").click();
    await sender.getByTestId("p2p-send").click();
    await third.getByTestId("p2p-receive-tab").click();
    await third.getByRole("button", { name: /^Accept/ }).waitFor();
    expect(await receiver.getByRole("button", { name: /^Accept/ }).count()).toBe(0);
    await third.getByRole("button", { name: /^Decline/ }).click();
    await sender.getByText("Declined", { exact: true }).waitFor();
    await receiver.reload();
    await receiver.getByTestId("p2p-receive-tab").click();
    await receiver.waitForFunction(() => document.querySelector('[data-testid="p2p-mute"]')?.getAttribute("aria-checked") === "false");
    await Promise.all([senderContext.close(), receiverContext.close(), thirdContext.close()]);
  }, 90_000);
});
