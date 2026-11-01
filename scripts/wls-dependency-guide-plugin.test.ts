import { afterEach, expect, it } from "vitest";
import { build, createServer } from "vite";
import { createServer as createHttpServer } from "node:http";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dependencyGuidePlugin } from "./wls-dependency-guide-plugin";

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => { for (const fn of cleanups.splice(0).reverse()) await fn(); });

it("serves exact generated guide bytes for GET/HEAD, with queries, but not arbitrary paths/methods", async () => {
  const root = await mkdtemp(join(tmpdir(), "wls-guide-server-"));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const server = await createServer({ configFile: false, root, publicDir: false, appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, plugins: [dependencyGuidePlugin()] });
  cleanups.push(() => server.close());
  const http = createHttpServer((req, res) => server.middlewares(req, res, () => {
    res.statusCode = 404; res.end("Not found");
  }));
  cleanups.push(() => new Promise<void>((resolve, reject) => http.close(error => error ? reject(error) : resolve())));
  await new Promise<void>(resolve => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  if (!address || typeof address === "string") throw Error("Missing test port");
  const base = `http://127.0.0.1:${address.port}`;
  const content = await readFile("public/wavelengthscript-dependencies.html", "utf8");
  const response = await fetch(`${base}/wavelengthscript-dependencies.html?version=0.17.0`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.text()).toBe(content);
  const head = await fetch(`${base}/wavelengthscript-dependencies.html`, { method: "HEAD" });
  expect(head.status).toBe(200);
  expect(Number(head.headers.get("content-length"))).toBe(Buffer.byteLength(content));
  expect(await head.text()).toBe("");
  for (const path of ["/unknown.html", "/wavelengthscript-dependencies.html/extra", "/public/wavelengthscript-dependencies.html"]) {
    expect((await fetch(base + path)).status).toBe(404);
  }
  expect((await fetch(`${base}/wavelengthscript-dependencies.html`, { method: "POST" })).status).toBe(404);
});

it("emits the canonical guide in a real Vite build and fails if its source is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "wls-guide-build-"));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "entry.js"), "export const value = 1;");
  const config = { configFile: false as const, root, publicDir: false as const,
    logLevel: "silent" as const, build: { write: false, rollupOptions: { input: join(root, "entry.js") } } };
  const result = await build({ ...config, plugins: [dependencyGuidePlugin()] });
  if (Array.isArray(result) || !("output" in result)) throw Error("Unexpected build result");
  const asset = result.output.find(item => item.fileName === "wavelengthscript-dependencies.html");
  expect(asset?.type).toBe("asset");
  if (asset?.type !== "asset") throw Error("Guide was not emitted");
  expect(Buffer.from(asset.source).toString("utf8")).toBe(await readFile("public/wavelengthscript-dependencies.html", "utf8"));
  await expect(build({ ...config, plugins: [dependencyGuidePlugin(join(root, "missing.html"))] })).rejects.toThrow();
});
