import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import multer from "multer";
import path from "node:path";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { ChildProcess } from "node:child_process";
import ts from "typescript";

const gateway = vi.hoisted(() => ({
  port: 0,
  children: [] as ChildProcess[],
  events: [] as Array<{ event: string; path?: string; body?: unknown; mode?: string }>,
}));

// Redirect only the supervisor's process launch to a real, harmless child.
// Keep its real exit events, process-group signals, retry timers and readiness loop.
vi.mock("node:child_process", async importOriginal => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: vi.fn((_command, _args, options) => {
      const child = actual.spawn(process.execPath, [
        "tests/fixtures/spectral-restart-gateway.cjs", String(gateway.port),
      ], {
        ...options,
        // Never pass application secrets or database settings into the child.
        env: {},
        stdio: ["ignore", "ignore", "inherit", "ipc"],
      });
      gateway.children.push(child);
      child.on("message", message => gateway.events.push(message as typeof gateway.events[number]));
      return child;
    }),
  };
});
vi.mock("./spectral-client", async importOriginal => {
  const actual = await importOriginal<typeof import("./spectral-client")>();
  return {
    ...actual,
    // Real HTTP and production timeout logic; only relocate fixed health port.
    fetchSpectralJson: (url: string, options?: RequestInit, timeout?: number) =>
      actual.fetchSpectralJson(url.replace("127.0.0.1:5001", `127.0.0.1:${gateway.port}`), options, timeout),
  };
});
import { SpectralProcess } from "./spectral-process";
import { fetchSpectralJson, SpectralServiceError } from "./spectral-client";

const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
function section(start: string, end: string) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error(`Missing real route section: ${start}`);
  return source.slice(first, last);
}
// Compile actual route registrations, not a hand-written copy. Importing all of
// routes.ts would start unrelated live services. Dynamic imports become a strict
// allowlisted require so no application database module can ever be loaded.
const routeSource = section('const VIDEO_EXTENSIONS = ', "// ── Live mempool cache") +
  section('  app.post("/api/agent-bus/send"', "  // Dispatch the next queued message") +
  section('  app.post("/api/spectral-workspace/video"', '  app.get("/api/spectral-workspace/video/:id"');
const javascript = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const builtinRequire = createRequire(import.meta.url);
const bytes = Buffer.from("synthetic-video-fixture-not-personal-media");
const tables = { videoUploads: "videoUploads", spectralRecords: "spectralRecords" };
let supervisor: SpectralProcess | undefined;
let server: Server | undefined;

afterEach(async () => {
  await supervisor?.stop();
  // Also reap children if setup or a readiness assertion failed.
  for (const child of gateway.children) {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise<void>(resolve => {
        child.once("exit", () => resolve());
        process.kill(-child.pid!, "SIGKILL");
      });
    }
  }
  if (server) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server!.close(() => resolve()));
  }
  supervisor = undefined;
  server = undefined;
  gateway.children.length = 0;
  gateway.events.length = 0;
});

async function listen(server: Server) {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as { port: number }).port;
}
async function waitFor(check: () => void) {
  await vi.waitFor(check, { timeout: 6000, interval: 20 });
}
async function fixture() {
  // Reserve a fresh port rather than touching the application's gateway.
  const reservation = createServer();
  gateway.port = await listen(reservation);
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const videos: any[] = [];
  const records: any[] = [];
  const messages: any[] = [];
  const db = {
    insert(table: string) {
      if (!Object.values(tables).includes(table)) throw new Error("Unexpected fixture table");
      return {
        values(row: any) {
          (table === tables.videoUploads ? videos : records).push(structuredClone(row));
          return { returning: async () => [row] };
        },
      };
    },
    execute: vi.fn(async (query: any) => { messages.push(query); }),
  };
  const ordinal = vi.fn(async () => null); // No treasury/wallet effects.
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join("?"), values });
  const fixtureRequire = (name: string) => {
    if (name === "./db") return { db };
    if (name === "@shared/schema") return tables;
    if (name === "drizzle-orm") return { sql };
    if (name === "crypto") return builtinRequire("node:crypto");
    throw new Error(`Forbidden application import: ${name}`);
  };
  const app = express();
  app.use(express.json());
  const authenticate: express.RequestHandler = (req, res, next) => {
    if (req.headers.authorization !== "Bearer restart-fixture") {
      res.status(401).json({ error: "Fixture authentication required" });
      return;
    }
    (req as any).user = { id: "fixture-user", username: "restart-fixture" };
    next();
  };
  new Function("app", "authenticate", "multer", "path", "SPECTRAL_API_URL",
    "fetchSpectralJson", "SpectralServiceError", "depositOrdinalForInput", "require", javascript)(
    app, authenticate, multer, path, `http://127.0.0.1:${gateway.port}`,
    fetchSpectralJson, SpectralServiceError, ordinal, fixtureRequire,
  );
  server = createServer(app);
  const base = `http://127.0.0.1:${await listen(server)}`;
  supervisor = new SpectralProcess();
  supervisor.start();
  await waitFor(() => expect(supervisor!.ready).toBe(true));

  async function request(kind: "video" | "message", authenticated = true) {
    const headers: Record<string, string> = authenticated ? { Authorization: "Bearer restart-fixture" } : {};
    const form = new FormData();
    form.set("title", "Restart fixture");
    form.set("description", "Synthetic description");
    form.set("file", new Blob([bytes], { type: "video/mp4" }), "fixture.mp4");
    const response = await fetch(base + (kind === "video" ? "/api/spectral-workspace/video" : "/api/agent-bus/send"), {
      method: "POST", headers: kind === "video" ? headers : { ...headers, "Content-Type": "application/json" },
      body: kind === "video" ? form : JSON.stringify({
        src: "fixture-src", dst: "fixture-dst", payload: "Synthetic message", priority: 3,
      }),
      signal: AbortSignal.timeout(40_000),
    });
    return { status: response.status, body: await response.json() as any };
  }
  return { request, videos, records, messages, ordinal, db };
}
async function mode(value: string) {
  const start = gateway.events.length;
  gateway.children.at(-1)!.send({ mode: value });
  await waitFor(() => expect(gateway.events.slice(start)).toContainEqual({ event: "mode", mode: value }));
}
async function assertSuccess(f: Awaited<ReturnType<typeof fixture>>, count: number) {
  const [video, message] = await Promise.all([f.request("video"), f.request("message")]);
  expect(video).toMatchObject({
    status: 200, body: { success: true, spectral: { psi_channel: "Ψ(7,2,H)" }, ordinal: null },
  });
  expect(video.body.videoId).toEqual(expect.any(String));
  expect(message).toMatchObject({ status: 200, body: { success: true, status: "queued", authority: "USER" } });
  expect(f.videos).toHaveLength(count);
  expect(f.records).toHaveLength(count);
  expect(f.messages).toHaveLength(count);
  expect(f.ordinal).toHaveBeenCalledTimes(count * 2);
  expect(f.videos.at(-1)).toMatchObject({
    id: video.body.videoId, uploaderId: "fixture-user", uploaderName: "restart-fixture",
    filename: "fixture.mp4", mimeType: "video/mp4", fileSize: bytes.length,
    videoData: bytes.toString("base64"), status: "ready",
  });
  expect(f.records.at(-1)).toMatchObject({
    id: video.body.record.id, label: "Restart fixture", content: "Synthetic description",
    psiChannel: "Ψ(7,2,H)", wdm: 7, oam: 2, polarisation: "H",
    data: { type: "video", videoId: video.body.videoId },
  });
  expect(f.messages.at(-1).values).toEqual([
    "fixture-src", "fixture-dst", "Ψ(7,2,H)", "Ψ(8,3,V)", "USER",
    "Synthetic message", "MESSAGE", 3, "queued", message.body.route,
  ]);
}

describe("video and agent-bus HTTP routes across supervised gateway restart", () => {
  it("authenticates, persists successes, fails in-flight and outage requests, then serves new requests", async () => {
    const f = await fixture();
    const initialEvents = gateway.events.length;
    for (const kind of ["video", "message"] as const) {
      expect((await f.request(kind, false)).status).toBe(401);
    }
    expect(gateway.events).toHaveLength(initialEvents);
    await assertSuccess(f, 1);
    expect(gateway.events).toContainEqual({
      event: "request", path: "/api/nexus/dev/encode",
      body: { instruction: "Restart fixture: Synthetic description", label: "Restart fixture" },
    });
    expect(gateway.events).toContainEqual({
      event: "request", path: "/api/wnsp/bus/send",
      body: { src: "fixture-src", dst: "fixture-dst", payload: "Synthetic message", priority: 3 },
    });
    await mode("hang");
    const eventCount = gateway.events.filter(e => e.event === "request").length;
    const started = Date.now();
    const pending = Promise.all([f.request("video"), f.request("message")]);
    await waitFor(() => expect(gateway.events.filter(e => e.event === "request")).toHaveLength(eventCount + 2));
    const firstChild = gateway.children[0];
    process.kill(-firstChild.pid!, "SIGKILL");
    await waitFor(() => expect(supervisor!.ready).toBe(false));
    for (const result of await pending) {
      expect(result).toEqual({ status: 503, body: { error: "Spectral API unavailable" } });
    }
    for (const result of await Promise.all([f.request("video"), f.request("message")])) {
      expect(result).toEqual({ status: 503, body: { error: "Spectral API unavailable" } });
    }
    expect(Date.now() - started).toBeLessThan(3000);
    expect(f.videos).toHaveLength(1);
    expect(f.records).toHaveLength(1);
    expect(f.messages).toHaveLength(1);
    expect(f.ordinal).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(supervisor!.ready).toBe(true));
    expect(gateway.children).toHaveLength(2);
    expect(gateway.children[1].pid).not.toBe(firstChild.pid);
    await assertSuccess(f, 2);
  }, 20_000);

  it.each(["hang", "body-hang"])("bounds %s requests with the real 30-second deadline and permits recovery", async value => {
    const f = await fixture();
    await mode(value);
    const started = Date.now();
    const results = await Promise.all([f.request("video"), f.request("message")]);
    for (const result of results) {
      expect(result).toEqual({ status: 504, body: { error: "Spectral API request timed out" } });
    }
    expect(Date.now() - started).toBeLessThan(35_000);
    expect(f.videos).toHaveLength(0);
    expect(f.records).toHaveLength(0);
    expect(f.messages).toHaveLength(0);
    expect(f.ordinal).not.toHaveBeenCalled();
    await mode("ok");
    await assertSuccess(f, 1);
  }, 45_000);

  it("returns explicit gateway HTTP failures without writing fixture persistence", async () => {
    const f = await fixture();
    await mode("error");
    expect(await f.request("video")).toEqual({ status: 502, body: { error: "Spectral encode failed" } });
    expect(await f.request("message")).toEqual({ status: 503, body: { error: "Fixture gateway unavailable" } });
    expect(f.videos).toHaveLength(0);
    expect(f.records).toHaveLength(0);
    expect(f.messages).toHaveLength(0);
    expect(f.ordinal).not.toHaveBeenCalled();
    await mode("ok");
    await assertSuccess(f, 1);
  }, 10_000);
});
