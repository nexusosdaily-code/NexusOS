import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import ts from "typescript";
import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import type { Express } from "express";
import { SessionSockets, SocketPeers, boundedSocketLookup } from "../session-sockets";
import { browserSocketToken } from "../browser-session-policy";
import { canViewStream, watchPrivateStream } from "../p2p-stream-access";
import { createStreamSchema } from "../../shared/schema";
import { z } from "zod";

// Test-only extraction, also used by session-sockets.routes.test.ts. Never
// imports the application startup, real auth provider, wallets or DB storage.
export function wireLiveVideoRoutes(app: Express, server: Server, storage: any, registry: SessionSockets) {
  const source = readFileSync(resolve("server/routes.ts"), "utf8");
  const section = (start: string, end: string) => {
    const from = source.indexOf(start), to = source.indexOf(end, from);
    if (from < 0 || to < from) throw new Error(`Live fixture route boundary missing: ${start}`);
    return ts.transpileModule(source.slice(from, to), {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText;
  };
  const wired = new Function(
    "httpServer", "storage", "socketSessions", "connectedClients", "WebSocketServer", "WebSocket",
    "browserSocketToken", "boundedSocketLookup", "SocketPeers", "canViewStream", "watchPrivateStream",
    section("  const wss = new WebSocketServer", "  // AUTHENTICATION ROUTES") +
      "; return {wss, streamingWss, streamClients};",
  )(server, storage, registry, new SocketPeers(), WebSocketServer, WebSocket,
    browserSocketToken, boundedSocketLookup, SocketPeers, canViewStream, watchPrivateStream);
  const auth = (req: any, res: any, next: any) => {
    const session = storage.sessions.get(req.cookies.auth_token);
    if (!session) return res.sendStatus(401);
    req.user = { id: session.userId };
    next();
  };
  const optional = (req: any, _res: any, next: any) => {
    req.user = storage.sessions.get(req.cookies.auth_token);
    if (req.user) req.user = { id: req.user.userId };
    next();
  };
  const validate = new Function("z",
    section("function validateRequest", "async function secureProxyToSpectralAPI") + "; return validateRequest;",
  )(z);
  new Function("app", "storage", "authenticate", "optionalAuth", "canViewStream", "logAction",
    "validateRequest", "createStreamSchema", "checkRateLimit",
    section('  app.post("/api/streams",', '  app.patch("/api/streams/:streamId/settings"') +
    section('  app.post("/api/streams/:streamId/join"', '  app.post("/api/streams/:streamId/recordings"'),
  )(app, storage, auth, optional, canViewStream, async () => {}, validate, createStreamSchema, async () => true);
  return wired;
}

export async function liveVideoBundle() {
  const result = await build({
    stdin: { contents: `import React from "react"; import {createRoot} from "react-dom/client";
      import {QueryClientProvider} from "@tanstack/react-query";
      import {queryClient} from "./client/src/lib/queryClient";
      import Page from "./client/src/pages/streaming";
      import Video from "./client/src/components/VideoStreaming";
      const root=createRoot(document.getElementById("root"));
      window.fixtureUnmount=()=>root.unmount();
      root.render(window.fixtureDirect
        ? React.createElement(Video,{streamId:"private",mode:window.fixtureDirect})
        : React.createElement(QueryClientProvider,{client:queryClient},React.createElement(Page)));`,
      resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    alias: { "@": resolve("client/src"), "@shared": resolve("shared") },
    plugins: [{ name: "isolated-identity", setup(plugin) {
      plugin.onResolve({ filter: /use-auth$/ }, () => ({ path: "auth", namespace: "fixture" }));
      plugin.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents:
        `export const useAuth=()=>({user:{id:window.fixtureUser,username:window.fixtureUser},isAuthenticated:true,isLoading:false});` }));
    } }],
  });
  return result.outputFiles[0].text;
}

// Observe native browser objects; do not stub RTC, capture, signaling or clocks.
export function observeNativeMedia() {
  const w = window as any;
  w.mediaEvidence = { peers: [], tracks: [], sockets: [], recorders: [], intervals: new Map(), errors: [] };
  const evidence = w.mediaEvidence;
  const NativePeer = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends NativePeer {
    constructor(config?: RTCConfiguration) { super(config); evidence.peers.push(this); }
  };
  const NativeSocket = window.WebSocket;
  window.WebSocket = class extends NativeSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols); evidence.sockets.push(this);
    }
  };
  const NativeRecorder = window.MediaRecorder;
  window.MediaRecorder = class extends NativeRecorder {
    constructor(stream: MediaStream, options?: MediaRecorderOptions) {
      super(stream, options); evidence.recorders.push(this);
    }
  };
  for (const method of ["getUserMedia", "getDisplayMedia"] as const) {
    const native = navigator.mediaDevices[method].bind(navigator.mediaDevices);
    navigator.mediaDevices[method] = async (...args: any[]) => {
      const stream = await native(...args);
      evidence.tracks.push(...stream.getTracks().map(track => ({ track, source: method })));
      if (w.fixtureHoldCapture) await new Promise<void>(resolve => { w.fixtureReleaseCapture = resolve; });
      return stream;
    };
  }
  const interval = window.setInterval.bind(window), clear = window.clearInterval.bind(window);
  window.setInterval = ((callback: TimerHandler, ms?: number, ...args: any[]) => {
    const id = interval(callback, ms, ...args);
    evidence.intervals.set(id, ms);
    return id;
  }) as typeof window.setInterval;
  window.clearInterval = ((id?: number) => { evidence.intervals.delete(id); clear(id); }) as typeof window.clearInterval;
  window.addEventListener("unhandledrejection", event => evidence.errors.push(String(event.reason)));
}
