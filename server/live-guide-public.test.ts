import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import fs from "node:fs";
import { request, type Server } from "node:http";
import { join } from "node:path";
import { isPublicSpaPath, serveStatic } from "./static";
import { ROUTE_META } from "./seo-meta";

// Exercise only the static HTTP layer; never initialise application workers or a DB.
vi.mock("./storage", () => ({ storage: {} }));

const servers: Server[] = [];
const shell = '<!doctype html><html><head><title>Fixture</title></head><body><div id="root"></div></body></html>';

async function probe(path: string, host = "wnsp.io") {
  const distPath = join(__dirname, "public");
  const exists = fs.existsSync.bind(fs);
  const read = fs.readFileSync.bind(fs);
  vi.spyOn(fs, "existsSync").mockImplementation(file =>
    String(file) === distPath || exists(file));
  vi.spyOn(fs, "readFileSync").mockImplementation(((file: fs.PathOrFileDescriptor, options: unknown) =>
    String(file) === join(distPath, "index.html") ? shell : read(file, options as never)
  ) as typeof fs.readFileSync);
  const app = express();
  serveStatic(app);
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const port = (server.address() as { port: number }).port;
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, headers: { Host: host } }, res => {
      let body = "";
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode!, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close(error => error ? reject(error) : resolve()));
  }
  vi.restoreAllMocks();
});

describe("public live guide direct links and crawler disclosure", () => {
  it.each(["/live-guide", "/live-guide/", "/live-guide?source=shared-link"])(
    "serves %s with HTTP 200 and the guide canonical", async path => {
      const result = await probe(path);
      expect(result.status).toBe(200);
      expect(result.body).toContain('rel="canonical" href="https://wnsp.io/live-guide"');
      expect(result.body).toContain('id="seo-prerender"');
      expect(result.body.match(/PASS · live video and audio/g)).toHaveLength(4);
    });

  it("does not accidentally expose private screens or unknown guide subpaths as public", () => {
    expect(isPublicSpaPath("/live-guide")).toBe(true);
    for (const path of ["/live-guide/unknown", "/wallet", "/wave-vault", "/settings"]) {
      expect(isPublicSpaPath(path)).toBe(false);
    }
  });

  it("still returns HTTP 404 for unknown guide subpaths", async () => {
    expect((await probe("/live-guide/unknown")).status).toBe(404);
  });

  it("preserves root-only microsite restrictions", async () => {
    expect((await probe("/live-guide", "spectralmirror.io")).status).toBe(404);
  });

  it("keeps non-JavaScript evidence consistent with the participant-confirmed passes", () => {
    const body = ROUTE_META["/live-guide"].bodyHtml!;
    expect(body).toContain("29 October 2026");
    expect(body).toContain("confirmed by the participants");
    for (const setup of ["Samsung Chrome → iPhone Chrome", "iPhone Chrome → Samsung Chrome", "iPhone → iPad", "iPad → iPhone"]) {
      expect(body).toContain(setup);
    }
    expect(body).toContain("subsequent retests passed with live video and audio");
    expect(body).not.toContain("failure remains unresolved");
    expect(body).not.toContain("different-network delivery remain unverified");
    expect(body).toContain("not proof of operator-inaccessible confidentiality or zero tracking");
    expect(body).toContain("No guaranteed emergency or background delivery");
  });
});
