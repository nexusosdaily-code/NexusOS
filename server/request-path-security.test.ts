import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import { request, type Server } from "node:http";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isForbiddenRequestPath, originalRequestPathname } from "./request-path-security";

describe("private request path guard", () => {
  it("does not confuse a wildcard-mounted request with the home page", () => {
    expect(originalRequestPathname({ originalUrl: "/missing?x=1", url: "/", path: "/" })).toBe("/missing");
    expect(originalRequestPathname({ originalUrl: "/.env", url: "/", path: "/" })).toBe("/.env");
    expect(originalRequestPathname({ originalUrl: "/constitution", url: "/" })).toBe("/constitution");
  });
  it.each([
    "/.env", "/.ENV", "/.env.local", "/.env.production.backup", "/backup/.env",
    "/.git", "/.git/config", "/.git/HEAD", "/nested/.git/config",
    "/%2eenv", "/%2Egit/config", "/.%65nv", "/%252eenv", "/%25252eenv",
    "/%2525252eenv", "/%252525252eenv", "/.env%00", "/%00/.env",
    "/.git%2fconfig", "/.git%252fconfig", "/.git%5cconfig",
    "/backup%5c.env.local", "/%2e%2e/.env", "/x/../.env",
    "/%zz", "/%2", "/.aws/credentials", "/.ssh/id_rsa", "/.kube/config",
    "/.well-known/.env", "/.well-known/.git/config", "/.agents/memory/MEMORY.md",
    "/.local/anything", "/.replit", "/node_modules/.env", "/node_modules/%2eenv",
    "/@fs/etc/.env", "/@fs/etc/passwd", "/@vite/client", "/@id/anything",
    "/server/index.ts", "/script/build.ts", "/scripts/anything",
    "/package.json", "/package-lock.json", "/pyproject.toml", "/uv.lock",
    "/.env?ignored=1", "/.env;anything", "/.git/config/",
  ])("blocks %s before the file server or page fallback", (path) => {
    expect(isForbiddenRequestPath(path)).toBe(true);
  });

  it.each([
    "/", "/constitution", "/hardware-spec", "/assets/app-123.js",
    "/.well-known/security.txt", "/.well-known/acme-challenge/token",
    "/api/messages/unread-count", "/api/auth/user",
    "/api/app/example/run", "/api/wallet/balance?note=/.env",
    "/people/Te%20Rata", "/the-memory", "/videos/123",
  ])("preserves legitimate public and authenticated routes: %s", (path) => {
    expect(isForbiddenRequestPath(path)).toBe(false);
  });

  it("allows only the intended development cache exception", () => {
    const cache = "/node_modules/.vite/deps/react.js?v=123";
    expect(isForbiddenRequestPath(cache)).toBe(true);
    expect(isForbiddenRequestPath(cache, true)).toBe(false);
    expect(isForbiddenRequestPath("/node_modules/.vite/deps/.env.js", true)).toBe(true);
    expect(isForbiddenRequestPath("/node_modules/.vite/deps/.git/config", true)).toBe(true);
    expect(isForbiddenRequestPath("/@fs/home/app/.env", true)).toBe(true);
    expect(isForbiddenRequestPath("/@fs/etc/passwd", true)).toBe(true);
    expect(isForbiddenRequestPath(`/@fs${join(process.cwd(), "server/index.ts")}`, true)).toBe(true);
    expect(isForbiddenRequestPath(`/@fs${join(process.cwd(), "shared/schema.ts")}`, true)).toBe(false);
    expect(isForbiddenRequestPath(`/@fs${join(process.cwd(), "client/src/main.tsx")}`, true)).toBe(false);
    const fsCache = `/@fs${join(process.cwd(), "node_modules/.vite/deps/react-dom_client.js")}`;
    expect(isForbiddenRequestPath(fsCache, true)).toBe(false);
    expect(isForbiddenRequestPath(fsCache)).toBe(true);
    expect(isForbiddenRequestPath(`/@fs${join(process.cwd(), "node_modules/.vite/deps/.env.js")}`, true)).toBe(true);
    expect(isForbiddenRequestPath("/@vite/client", true)).toBe(false);
    expect(isForbiddenRequestPath("/node_modules/.vite/deps/react.js.map", true)).toBe(false);
  });

  it("bounds decoding and ignores query parameters when inspecting paths", () => {
    expect(isForbiddenRequestPath("/" + "a".repeat(8192))).toBe(true);
    expect(isForbiddenRequestPath("/ordinary?data=%zz")).toBe(false);
  });
});

describe("private paths cannot reach static files or a HTTP-200 page fallback", () => {
  let server: Server;
  let directory: string;
  let port: number;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "wnsp-path-guard-"));
    await mkdir(join(directory, ".git"));
    await mkdir(join(directory, ".well-known"));
    // Synthetic fixtures only: never read actual credentials or repository files.
    await writeFile(join(directory, ".env"), "PRIVATE_TEST_FIXTURE");
    await writeFile(join(directory, ".git", "config"), "PRIVATE_TEST_FIXTURE");
    await writeFile(join(directory, "app.js"), "PUBLIC_TEST_FIXTURE");
    await writeFile(join(directory, ".well-known", "security.txt"), "PUBLIC_CONTACT");
    const app = express();
    app.use((req, res, next) => {
      if (isForbiddenRequestPath(req.originalUrl)) {
        res.status(403).json({ error: "Not found." });
        return;
      }
      next();
    });
    app.use(express.static(directory, { dotfiles: "deny" }));
    app.use("*", (req, res) => {
      const status = originalRequestPathname(req) === "/" ? 200 : 404;
      res.status(status).type("html").send("<html>Public fallback</html>");
    });
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    port = (server.address() as { port: number }).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });

  function probe(path: string, method = "GET"): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port, path, method }, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode!, body }));
      });
      req.on("error", reject);
      req.end();
    });
  }

  it.each(["/.env", "/%2eenv", "/%252eenv", "/.git%2fconfig", "/.git%5cconfig", "/x/../.env"])(
    "rejects raw HTTP requests for %s", async (path) => {
      const result = await probe(path);
      expect(result.status).toBe(403);
      expect(result.body).not.toContain("PRIVATE_TEST_FIXTURE");
      expect(result.body).not.toContain("Public fallback");
    },
  );

  it.each(["HEAD", "POST", "OPTIONS"])("guards %s as well as GET", async (method) => {
    expect((await probe("/%2eenv", method)).status).toBe(403);
  });

  it("keeps normal assets and the public page working", async () => {
    expect((await probe("/app.js")).body).toBe("PUBLIC_TEST_FIXTURE");
    expect((await probe("/")).status).toBe(200);
  });

  it("returns 404 for an unknown URL even inside a wildcard mount", async () => {
    expect((await probe("/not-a-real-public-page")).status).toBe(404);
  });
});
