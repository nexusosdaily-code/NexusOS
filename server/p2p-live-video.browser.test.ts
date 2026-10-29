import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { SessionSockets } from "./session-sockets";
import { notifySessionRevoked } from "./session-lifecycle";
import { revokeStreamGuest } from "./p2p-stream-access";
import { liveVideoBundle, observeNativeMedia, wireLiveVideoRoutes } from "./fixtures/live-video-browser";

const acl = vi.hoisted(() => ({ guests: new Set<string>(), fail: false, reads: 0 }));
vi.mock("./db", () => ({ pool: { query: async (sql: string, params: unknown[]) => {
  if (!sql.includes("SELECT 1 FROM p2p_stream_guests")) throw new Error("Real DB access forbidden in video fixture");
  acl.reads++;
  if (acl.fail) throw new Error("Synthetic ACL outage");
  return { rows: acl.guests.has(`${params[0]}:${params[1]}`) ? [{ allowed: 1 }] : [] };
} } }));

describe.skipIf(process.env.WNSP_LIVE_VIDEO_BROWSER_TEST !== "1")("isolated native live-video RTC", () => {
  let ownerBrowser: Browser, viewerBrowser: Browser, bundle: string;
  let server: Server, registry: SessionSockets, wired: ReturnType<typeof wireLiveVideoRoutes>, origin: string;
  let owner: Page, viewer: Page, contexts: BrowserContext[];
  let sessions: Map<string, any>, streams: Map<string, any>, viewers: Set<string>;
  let failStart: boolean;
  const unexpected: string[] = [], mutations: string[] = [], browserErrors: string[] = [];
  const makeStream = (id: string, isPublic: boolean) => ({
    id, isPublic, broadcasterId: "owner", title: `${id} fixture broadcast`, status: "pending",
    viewerCount: 0, quality: "720p", createdAt: new Date().toISOString(),
  });
  beforeAll(async () => {
    bundle = await liveVideoBundle();
    const options = { executablePath: process.env.WNSP_TEST_CHROMIUM_PATH || "/repl/tools/bin/chromium", headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--auto-select-tab-capture-source-by-title=Live video fixture", "--allow-http-screen-capture"] };
    // Independent browser processes, not two mocked peers in one JS runtime.
    [ownerBrowser, viewerBrowser] = await Promise.all([chromium.launch(options), chromium.launch(options)]);
  }, 30_000);
  beforeEach(async () => {
    acl.guests.clear(); acl.guests.add("private:guest"); acl.fail = false; acl.reads = 0;
    contexts = []; unexpected.length = 0; mutations.length = 0; browserErrors.length = 0;
    failStart = false;
    sessions = new Map(["owner", "guest", "guest-two", "outsider"].map(id =>
      [id, { id, userId: id, expiresAt: new Date(Date.now() + 600_000) }]));
    streams = new Map([["private", makeStream("private", false)], ["public", makeStream("public", true)]]);
    streams.get("public").status = "live"; // Existing public discovery fixture.
    viewers = new Set();
    const storage = {
      sessions,
      getSessionByToken: async (token: string) => sessions.get(token),
      getStream: async (id: string) => streams.get(id),
      createStream: async (input: any) => {
        const id = `created-${streams.size}`;
        const stream = { ...makeStream(id, input.isPublic), ...input, id, status: "pending" };
        streams.set(id, stream);
        return stream;
      },
      getUser: async (id: string) => ({ id, username: id }),
      // Storage-only substitute; the real SQL ACL is separately PostgreSQL-tested.
      getLiveStreams: async () => [...streams.values()].filter(s => s.isPublic && s.status === "live")
        .map(stream => ({ stream, broadcaster: { id: "owner", username: "owner" } })),
      getUserStreams: async (id: string) => [...streams.values()].filter(s => s.broadcasterId === id),
      addStreamViewer: async (id: string, user: string) => { viewers.add(`${id}:${user}`); return { userId: user }; },
      removeStreamViewer: async (id: string, user: string) => { viewers.delete(`${id}:${user}`); },
      updateStreamStatus: async (id: string, status: string) => {
        if (failStart) throw new Error("Synthetic stream-start storage failure");
        return Object.assign(streams.get(id), { status });
      },
      endStream: async (id: string) => Object.assign(streams.get(id), { status: "ended", duration: 0, peakViewers: 1 }),
    };
    const app = express();
    app.use(express.json(), cookieParser());
    app.use((req, _res, next) => { if (req.method !== "GET") mutations.push(`${req.method} ${req.path}`); next(); });
    app.get("/fixture.js", (_req, res) => res.type("js").send(bundle));
    app.get("/api/lightning/balance", (_req, res) => res.json({ satsBalance: 0 }));
    // Test-only discovery/invitation model. Actual SQL/HTTP invitation handlers
    // are covered independently by the isolated PostgreSQL integration suite.
    const audience = (id: string) => [...acl.guests].filter(key => key.startsWith(id + ":"))
      .map(key => ({ userId:key.slice(id.length + 1),waveAddress:`wnsp://Ψ(12,3,H)/${key.slice(id.length + 1)}` }));
    app.get("/api/p2p/live", (req,res) => {
      const user = sessions.get(req.cookies.auth_token)?.userId;
      res.setHeader("Cache-Control","no-store");
      res.json({ streams:[...streams.values()].filter(stream =>
        (stream.isPublic && stream.status === "live") ||
        (["pending","live"].includes(stream.status) &&
          (stream.broadcasterId === user || acl.guests.has(`${stream.id}:${user}`))))
        .map(stream => ({id:stream.id,title:stream.title,broadcasterId:stream.broadcasterId,isPublic:stream.isPublic,status:stream.status})) });
    });
    app.get("/api/p2p/live/:id/guests", (req,res) => {
      if (streams.get(req.params.id)?.broadcasterId !== sessions.get(req.cookies.auth_token)?.userId) return res.sendStatus(404);
      res.json({guests:audience(req.params.id)});
    });
    app.post("/api/p2p/live/:id/guests", (req,res) => {
      const room=streams.get(req.params.id);
      if (!room || room.broadcasterId !== sessions.get(req.cookies.auth_token)?.userId) return res.sendStatus(404);
      const target = ["guest","guest-two"].find(user => req.body.address === `wnsp://Ψ(12,3,H)/${user}`);
      if (!target || room.isPublic || !["pending","live"].includes(room.status)) return res.sendStatus(400);
      acl.guests.add(`${room.id}:${target}`);
      res.json({ok:true});
    });
    app.get("/api/directory/recipients", (_req,res) => res.json({recipients:[]}));
    app.get(["/streaming", "/streaming/:id", "/direct/:mode"], (req, res) => {
      if (req.query.denyScreen === "1") res.setHeader("Permissions-Policy", "display-capture=()");
      // Identity cookies are installed by Playwright only, on this ephemeral server.
      res.send(`<!doctype html><html><head><title>Live video fixture</title>
        <style>body{margin:0;background:#0f172a;color:white} video{width:640px;height:360px} button{margin:4px}</style></head>
        <body><div id="root"></div><script>window.fixtureUser=${JSON.stringify(req.cookies.auth_token)};
        window.fixtureDirect=${JSON.stringify(req.params.mode || null)}</script><script src="/fixture.js"></script></body></html>`);
    });
    server = createServer(app);
    registry = new SessionSockets(async ids => [...sessions.values()].filter(s => ids.includes(s.id)));
    wired = wireLiveVideoRoutes(app, server, storage, registry);
    app.use((req, res) => { unexpected.push(`${req.method} ${req.path}`); res.sendStatus(404); });
    await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
    origin = `http://127.0.0.1:${(server.address() as any).port}`;
    owner = await pageFor(ownerBrowser, "owner"); viewer = await pageFor(viewerBrowser, "guest");
  });
  async function pageFor(browser: Browser, user: string) {
    const context = await browser.newContext({ permissions: ["camera", "microphone"] });
    context.setDefaultTimeout(10_000);
    contexts.push(context);
    await context.addCookies([{ name: "auth_token", value: user, url: origin, httpOnly: true, sameSite: "Lax" }]);
    await context.addInitScript(observeNativeMedia);
    await context.route("**/*", route => {
      if (!route.request().url().startsWith(origin + "/")) {
        unexpected.push(route.request().url()); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", error => browserErrors.push(error.message));
    return page;
  }
  afterEach(async () => {
    await Promise.all(contexts.map(context => context.close()));
    registry.dispose();
    for (const ws of [...wired.wss.clients, ...wired.streamingWss.clients]) ws.terminate();
    server.closeAllConnections();
    await new Promise<void>(done => server.close(() => done()));
    expect(unexpected, "unexpected HTTP/API calls").toEqual([]);
    expect(browserErrors, "uncaught page errors").toEqual([]);
  });
  afterAll(async () => { await Promise.all([ownerBrowser?.close(), viewerBrowser?.close()]); });

  async function start(source = "camera", id = "private", direct = false) {
    await owner.goto(origin + (direct ? "/direct/broadcaster" : `/streaming/${id}`));
    await owner.getByTestId(`button-source-${source}`).click();
    await owner.getByTestId("button-go-live").click();
    await owner.getByTestId("badge-live").waitFor();
    await owner.waitForFunction(() => (window as any).mediaEvidence.sockets.some((s: WebSocket) => s.readyState === 1));
  }
  async function receive(id = "private") {
    await viewer.goto(origin + `/streaming/${id}`);
    await viewer.getByTestId("video-viewer").waitFor();
    await viewer.waitForFunction(async () => {
      const peers = (window as any).mediaEvidence.peers as RTCPeerConnection[];
      for (const pc of peers) {
        const stats = await pc.getStats();
        if ([...stats.values()].some(s => s.type === "inbound-rtp" && s.kind === "video" && s.framesDecoded >= 8)) return true;
      }
      return false;
    }, undefined, { timeout: 30_000 });
    await viewer.evaluate(() => {
      const w = window as any;
      w.mediaEvidence.presentedFrames = 0;
      const video = document.querySelector("video")!;
      const count = () => { w.mediaEvidence.presentedFrames++; video.requestVideoFrameCallback(count); };
      video.requestVideoFrameCallback(count);
    });
    await viewer.waitForFunction(() => (window as any).mediaEvidence.presentedFrames >= 5);
  }

  it("negotiates a viewer already waiting before the broadcaster connects, with normal autoplay policy", async () => {
    await viewer.goto(origin + "/direct/viewer");
    await viewer.waitForFunction(() => (window as any).mediaEvidence.sockets.some((socket: WebSocket) => socket.readyState === 1));
    await viewer.getByTestId("stream-receive-status").waitFor();
    expect(await viewer.getByTestId("badge-live").count()).toBe(0);
    await start("camera", "private", true);
    await viewer.waitForFunction(async () => {
      for (const pc of (window as any).mediaEvidence.peers as RTCPeerConnection[]) {
        const stats = await pc.getStats();
        if ([...stats.values()].some(s => s.type === "inbound-rtp" && s.kind === "video" && s.framesDecoded >= 8)) return true;
      }
      return false;
    }, undefined, { timeout: 30_000 });
    await viewer.getByTestId("badge-live").waitFor();
    await viewer.waitForFunction(() => /Connection: connected; video: [1-9]\d* frames/.test(
      document.querySelector('[data-testid="stream-media-diagnostic"]')?.textContent ?? "",
    ));
    expect(await viewer.getByTestId("video-viewer").evaluate((video: HTMLVideoElement) => video.muted && !video.paused)).toBe(true);
    await viewer.getByTestId("button-stream-sound").click();
    expect(await viewer.getByTestId("video-viewer").evaluate((video: HTMLVideoElement) => video.muted)).toBe(false);
    await owner.getByTestId("button-close").click();
    await closed(owner, true); await closed(viewer);
  }, 45_000);
  it("still answers and delivers media when a remote candidate is rejected before SDP arrives", async () => {
    // Exercise the actual signaling routes and native addIceCandidate, not an
    // RTC mock. This reproduces a negotiation defect, not the physical Safari
    // incident: we do not know which candidates those devices exchanged.
    for (const page of [owner, viewer]) {
      await page.addInitScript(() => {
        const send = WebSocket.prototype.send;
        WebSocket.prototype.send = function(data) {
          const message = typeof data === "string" ? JSON.parse(data) : {};
          if (message.type === "offer" || message.type === "answer") {
            send.call(this, JSON.stringify({
              ...message, type: "ice-candidate",
              payload: { candidate: "candidate:invalid", sdpMid: "missing", sdpMLineIndex: 65535 },
            }));
          }
          return send.call(this, data);
        };
      });
    }
    await start("camera");
    await receive();
    for (const page of [owner, viewer]) {
      await expect.poll(() => page.getByTestId("stream-media-diagnostic").textContent(), { timeout: 10_000 })
        .toMatch(/remote ICE: \d+ accepted, 1 rejected/);
    }
    await viewer.getByTestId("button-stream-sound").click();
    await viewer.waitForFunction(async () => {
      const pc = (window as any).mediaEvidence.peers[0] as RTCPeerConnection;
      const stats = await pc.getStats();
      return [...stats.values()].some(s => s.type === "inbound-rtp" &&
        s.kind === "audio" && s.bytesReceived > 0);
    });
    // Recovery must not keep the direct media path alive after access is lost.
    acl.guests.delete("private:guest");
    revokeStreamGuest("private", "guest");
    await closed(viewer);
    await noMoreFrames();
  }, 45_000);

  it("delivers H.264-only offers to an independent receiver without SDP rewriting", async () => {
    // A codec-specific Chromium interoperability check, NOT Safari emulation
    // and not evidence that the reported iOS failure was codec-related.
    await owner.addInitScript(() => {
      const createOffer = RTCPeerConnection.prototype.createOffer;
      RTCPeerConnection.prototype.createOffer = function(options?: RTCOfferOptions) {
        const codecs = RTCRtpSender.getCapabilities("video")!.codecs.filter(codec =>
          codec.mimeType.toLowerCase() === "video/h264");
        if (!codecs.length) throw new Error("H.264 encoder unavailable in test browser");
        for (const transceiver of this.getTransceivers()) {
          if (transceiver.sender.track?.kind === "video") transceiver.setCodecPreferences(codecs);
        }
        return createOffer.call(this, options);
      };
    });
    await start("camera");
    await receive();
    await expect.poll(() => viewer.getByTestId("stream-media-diagnostic").textContent(), { timeout: 10_000 })
      .toMatch(/codecs:.*video\/H264/i);
    await expect.poll(() => owner.getByTestId("stream-media-diagnostic").textContent(), { timeout: 10_000 })
      .toMatch(/SDP: answer applied \(stable\).*DTLS: connected/);
  }, 45_000);

  it("switches generated camera video twice on the same native RTC connection without replacing microphone audio", async () => {
    await start(); await receive();
    expect(await viewer.getByTestId("button-switch-camera").count()).toBe(0);
    await owner.evaluate(() => {
      const w = window as any;
      const original = document.querySelector("video")!.srcObject as MediaStream;
      w.switchEvidence = { audio: original.getAudioTracks()[0], requests: [], replacements: [], failNext: true };
      // Hardware directions are synthetic here; actual media tracks, encoding,
      // RTCRtpSender.replaceTrack, transport and receiver decoding remain native.
      navigator.mediaDevices.getUserMedia = async input => {
        const facing = (input?.video as MediaTrackConstraints)?.facingMode as { exact: string };
        if (input?.audio !== false || !facing?.exact) throw new Error("Unexpected switch capture");
        w.switchEvidence.requests.push(facing.exact);
        if (w.switchEvidence.failNext) {
          w.switchEvidence.failNext = false;
          throw new DOMException("Synthetic camera denial", "NotAllowedError");
        }
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 360;
        const context = canvas.getContext("2d")!;
        context.fillStyle = facing.exact === "environment" ? "#ff0000" : "#0000ff";
        context.fillRect(0, 0, 640, 360);
        const stream = canvas.captureStream(20);
        const track = stream.getVideoTracks()[0];
        const draw = () => {
          if (track.readyState === "ended") return;
          context.fillRect(0, 0, 640, 360);
          requestAnimationFrame(draw);
        };
        draw();
        w.switchEvidence.replacements.push(track);
        w.mediaEvidence.tracks.push({ track, source: "generated-camera-switch" });
        return stream;
      };
    });
    await owner.getByTestId("button-switch-camera").click();
    await owner.getByTestId("camera-switch-error").waitFor();
    expect(await owner.getByTestId("camera-switch-error").textContent()).toContain("Synthetic camera denial");
    expect(await owner.evaluate(() => (document.querySelector("video")!.srcObject as MediaStream)
      .getAudioTracks()[0] === (window as any).switchEvidence.audio)).toBe(true);
    await owner.getByTestId("button-toggle-recording").click();
    expect(await owner.getByTestId("button-switch-camera").isDisabled()).toBe(true);
    await owner.getByTestId("button-toggle-recording").click();
    for (const expectedColor of ["red", "blue"]) {
      await owner.getByTestId("button-switch-camera").click();
      await viewer.waitForFunction(color => {
        const video = document.querySelector("video")!;
        if (video.readyState < 2) return false;
        const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
        const context = canvas.getContext("2d")!;
        context.drawImage(video, 0, 0, 1, 1);
        const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
        return color === "red" ? red > 180 && green < 70 && blue < 70 : blue > 180 && red < 70 && green < 70;
      }, expectedColor, { timeout: 15_000 });
    }
    expect(await owner.evaluate(() => {
      const w = window as any, current = document.querySelector("video")!.srcObject as MediaStream;
      return {
        requests: w.switchEvidence.requests,
        sameMicrophone: current.getAudioTracks()[0] === w.switchEvidence.audio,
        microphoneLive: w.switchEvidence.audio.readyState,
        peers: w.mediaEvidence.peers.length, sockets: w.mediaEvidence.sockets.length,
        oldReplacementStopped: w.switchEvidence.replacements[0].readyState,
      };
    })).toEqual({ requests: ["environment", "environment", "user"], sameMicrophone: true,
      microphoneLive: "live", peers: 1, sockets: 1, oldReplacementStopped: "ended" });
    expect(await viewer.evaluate(() => (window as any).mediaEvidence.peers.length)).toBe(1);
    await owner.getByTestId("button-close").click();
    await closed(owner, true); await closed(viewer); await noMoreFrames();
  }, 60_000);

  async function closed(page: Page, captureEnded = false) {
    await page.waitForFunction((captureEnded) => {
      const e = (window as any).mediaEvidence;
      return e.peers.length > 0 && e.peers.every((pc: RTCPeerConnection) => pc.connectionState === "closed") &&
        [...document.querySelectorAll("video")].every(v => v.srcObject === null) &&
        (!captureEnded || (e.tracks.length > 0 && e.tracks.every(({ track }: any) => track.readyState === "ended"))) &&
        e.recorders.every((recorder: MediaRecorder) => recorder.state === "inactive") &&
        ![...e.intervals.values()].some(ms => ms === 1000 || ms === 60_000);
    }, captureEnded);
    expect(await page.evaluate(() => (window as any).mediaEvidence.errors)).toEqual([]);
  }
  async function noMoreFrames() {
    // Allow already queued presentation callbacks to settle, then observe a
    // real interval. Closure alone would not prove that rendered media stopped.
    await viewer.waitForTimeout(300);
    const before = await viewer.evaluate(() => (window as any).mediaEvidence.presentedFrames);
    await viewer.waitForTimeout(1200);
    expect(await viewer.evaluate(() => (window as any).mediaEvidence.presentedFrames)).toBe(before);
  }

  it.each([true, false])("creates a pending channel over actual HTTP, then publishes and delivers media (public=%s)", async isPublic => {
    await owner.goto(origin + "/streaming");
    const created = await owner.request.post(origin + "/api/streams", {
      data: { title: "New pending broadcast", isPublic, streamType: "camera" },
    });
    expect(created.status()).toBe(201);
    const { stream } = await created.json();
    expect(stream.status).toBe("pending");
    expect((await viewer.request.post(origin + `/api/streams/${stream.id}/join`)).status()).toBe(400);
    const pendingDiscovery = await (await viewer.request.get(origin + "/api/streams/live")).json();
    expect(pendingDiscovery.streams.some((s: any) => s.id === stream.id)).toBe(false);

    // This is also the owner-URL flow used after /p2p stream creation.
    if (!isPublic) {
      expect((await owner.request.post(origin + `/api/p2p/live/${stream.id}/guests`, {
        data:{address:"wnsp://Ψ(12,3,H)/guest"},
      })).status()).toBe(200);
    }
    await start("camera", stream.id);
    expect(streams.get(stream.id).status).toBe("live");
    const discovery = await (await viewer.request.get(origin + "/api/streams/live")).json();
    expect(discovery.streams.some((s: any) => s.id === stream.id)).toBe(isPublic);
    if (!isPublic) {
      const outsider=await pageFor(viewerBrowser,"outsider");
      expect((await outsider.request.post(origin + `/api/streams/${stream.id}/join`)).status()).toBe(403);
    }
    await receive(stream.id);
    await owner.getByTestId("button-close").click();
    await closed(owner, true); await closed(viewer); await noMoreFrames();
    await owner.waitForFunction(() => document.querySelector('[data-testid="tab-mine"]') !== null);
    expect(streams.get(stream.id).status).toBe("ended");
  }, 45_000);

  it("cleans capture after a failed server start, stays pending, and can retry successfully", async () => {
    failStart = true;
    await owner.goto(origin + "/streaming/private");
    await owner.getByTestId("button-go-live").click();
    await owner.getByTestId("camera-error-banner").getByText(/Could not start broadcast/).waitFor();
    expect(streams.get("private").status).toBe("pending");
    expect(await owner.evaluate(() => {
      const e = (window as any).mediaEvidence;
      return { captured: e.tracks.length > 0, stopped: e.tracks.every(({ track }: any) => track.readyState === "ended"),
        sockets: e.sockets.length, peers: e.peers.length, videoCleared: document.querySelector("video")?.srcObject === null,
        duration: [...e.intervals.values()].includes(1000) };
    })).toEqual({ captured: true, stopped: true, sockets: 0, peers: 0, videoCleared: true, duration: false });
    expect(await owner.getByTestId("badge-live").count()).toBe(0);
    failStart = false;
    await owner.getByTestId("button-go-live").click();
    await owner.getByTestId("badge-live").waitFor();
    await receive();
    await owner.getByTestId("button-close").click();
    await closed(owner, true); await closed(viewer); await noMoreFrames();
  }, 45_000);

  it("shows public discovery, hides private metadata/media from outsiders and protects owner controls", async () => {
    await start();
    const outsider = await pageFor(viewerBrowser, "outsider");
    await outsider.goto(origin + "/streaming");
    await outsider.getByTestId("card-stream-public").waitFor();
    expect(await outsider.getByTestId("card-stream-private").count()).toBe(0);
    expect((await outsider.request.get(origin + "/api/streams/private")).status()).toBe(403);
    expect((await outsider.request.post(origin + "/api/streams/private/join")).status()).toBe(403);
    for (const action of ["start", "end"]) {
      expect((await viewer.request.post(origin + `/api/streams/private/${action}`)).status()).toBe(403);
    }
    mutations.length = 0;
    await outsider.goto(origin + "/direct/viewer");
    await outsider.waitForFunction(() => (window as any).mediaEvidence.sockets.some((s: WebSocket) => s.readyState === 3));
    expect(await outsider.evaluate(() => (window as any).mediaEvidence.peers.length)).toBe(0);
    // A forged broadcaster role still goes through the actual socket handler.
    await viewer.goto(origin + "/streaming");
    const rejected = await viewer.evaluate(async () => new Promise<number>(resolve => {
      const ws = new WebSocket(`ws://${location.host}/ws/streaming?streamId=private&role=broadcaster`);
      ws.onclose = event => resolve(event.code);
    }));
    expect(rejected).toBe(1008);
    await receive();
    expect(await viewer.getByTestId("button-go-live").count()).toBe(0);
    expect(await viewer.getByTestId("button-settings").count()).toBe(0);
    await owner.getByTestId("button-toggle-audio").click();
    await owner.getByTestId("button-toggle-video").click();
    expect(await owner.evaluate(() => (window as any).mediaEvidence.tracks.every(({ track }: any) => !track.enabled))).toBe(true);
    await owner.getByTestId("button-toggle-audio").click();
    await owner.getByTestId("button-toggle-video").click();
    await viewer.getByTestId("button-close").click();
    await closed(viewer);
    await owner.waitForFunction(() => (window as any).mediaEvidence.peers.every((p: RTCPeerConnection) => p.connectionState === "closed"));
    expect(mutations).not.toContain("POST /api/streams/private/end");
    expect(mutations).toContain("POST /api/streams/private/leave");
    expect(await owner.evaluate(() => (window as any).mediaEvidence.tracks.every(({ track }: any) => track.readyState === "live"))).toBe(true);
    await owner.getByTestId("button-close").click();
    await closed(owner, true);
    await noMoreFrames();
  }, 60_000);

  it.each(["grant", "session", "remote ACL", "ACL outage"])("stops both established peers and all further frames after %s revocation", async kind => {
    await start(); await receive();
    if (kind === "session") { sessions.delete("guest"); notifySessionRevoked("guest"); }
    else if (kind === "ACL outage") acl.fail = true;
    else { acl.guests.delete("private:guest"); if (kind === "grant") revokeStreamGuest("private", "guest"); }
    await closed(viewer);
    await owner.waitForFunction(() => (window as any).mediaEvidence.peers.every((pc: RTCPeerConnection) => pc.connectionState === "closed"));
    await noMoreFrames();
    expect(viewers.has("private:guest")).toBe(false);
    const rejoinStatus = (await viewer.request.post(origin + "/api/streams/private/join")).status();
    expect(rejoinStatus).toBe(kind === "session" ? 401 : kind === "ACL outage" ? 500 : 403);
    expect(await owner.evaluate(() => (window as any).mediaEvidence.tracks.every(({ track }: any) => track.readyState === "live"))).toBe(true);
    await owner.getByTestId("button-close").click();
    await closed(owner, true);
  }, 45_000);

  it.each(["end", "disconnect", "unmount"])("cleans camera, recording, duration and heartbeat on owner %s", async action => {
    await start(); await receive();
    await owner.getByTestId("button-toggle-recording").click();
    await owner.getByTestId("badge-recording").waitFor();
    if (action === "end") await owner.getByTestId("button-close").click();
    if (action === "disconnect") {
      for (const ws of wired.streamingWss.clients) {
        // The owner is identified by the actual route's peer registry.
        if (wired.streamClients.get("private")?.get("owner")?.ws === ws) ws.terminate();
      }
    }
    if (action === "unmount") await owner.evaluate(() => (window as any).fixtureUnmount());
    await closed(owner, true); await closed(viewer); await noMoreFrames();
    expect(viewers.size).toBe(0);
    expect(await owner.evaluate(() => document.querySelector('[data-testid="badge-recording"]'))).toBeNull();
  }, 45_000);

  it("transmits a real captured browser tab and cleans screen tracks when capture ends", async () => {
    await start("screen"); await receive();
    expect(await owner.evaluate(() => (window as any).mediaEvidence.tracks.some(
      ({ track, source }: any) => source === "getDisplayMedia" && track.kind === "video" && track.readyState === "live"))).toBe(true);
    // Native track.stop does not dispatch ended; emulate the browser's stop-
    // sharing notification after stopping the real captured source.
    await owner.evaluate(() => {
      const { track } = (window as any).mediaEvidence.tracks.find(({ source, track }: any) => source === "getDisplayMedia" && track.kind === "video");
      track.stop(); track.dispatchEvent(new Event("ended"));
    });
    await closed(owner, true); await closed(viewer); await noMoreFrames();
  }, 45_000);

  it("delivers public video to an uninvited authenticated browser", async () => {
    await start("camera", "public");
    await viewer.context().addCookies([{ name: "auth_token", value: "outsider", url: origin }]);
    await receive("public");
    await owner.getByTestId("button-close").click();
    await closed(owner, true); await closed(viewer); await noMoreFrames();
  }, 45_000);

  it("reports native camera permission denial without starting signaling, capture or timers", async () => {
    // Fake-UI launch flags override explicit denials. Use a separate native
    // browser without that flag so denial is enforced by Chromium itself.
    const deniedBrowser = await chromium.launch({ executablePath: process.env.WNSP_TEST_CHROMIUM_PATH || "/repl/tools/bin/chromium", headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-fake-device-for-media-stream"] });
    const deniedPage = await pageFor(deniedBrowser, "owner");
    owner = deniedPage;
    try {
    await owner.context().clearPermissions();
    await owner.context().grantPermissions([], { origin });
    await owner.goto(origin + "/streaming/private");
    await owner.getByTestId("button-go-live").click();
    await owner.getByTestId("camera-error-banner").getByText(/permission denied/).waitFor();
    expect(await owner.evaluate(() => {
      const e = (window as any).mediaEvidence;
      return { tracks: e.tracks.length, peers: e.peers.length, sockets: e.sockets.length,
        duration: [...e.intervals.values()].includes(1000) };
    })).toEqual({ tracks: 0, peers: 0, sockets: 0, duration: false });
    await owner.evaluate(() => (window as any).fixtureUnmount());
    await owner.waitForFunction(() => ![...(window as any).mediaEvidence.intervals.values()].includes(60_000));
    } finally { await deniedBrowser.close(); }
  }, 20_000);

  it("reports browser-enforced screen-capture denial without leaking media or timers", async () => {
    await owner.goto(origin + "/streaming/private?denyScreen=1");
    await owner.getByTestId("button-source-screen").click();
    await owner.getByTestId("button-go-live").click();
    await owner.getByTestId("camera-error-banner").getByText(/Screen sharing was denied/).waitFor();
    expect(await owner.evaluate(() => {
      const e = (window as any).mediaEvidence;
      return [e.tracks.length, e.peers.length, e.sockets.length,
        [...e.intervals.values()].filter(ms => ms === 1000).length];
    })).toEqual([0, 0, 0, 0]);
  }, 20_000);

  it("selects multiple private recipients before capture and discovers the live invitation in an already-open receiver", async () => {
    await viewer.goto(origin + "/streaming");
    await owner.goto(origin + "/streaming?create=private");
    await owner.getByTestId("input-stream-title").fill("Family live test");
    for (const target of ["guest","guest-two"]) {
      await owner.getByTestId("input-broadcast-address").fill(`wnsp://Ψ(12,3,H)/${target}`);
      await owner.getByRole("button",{name:"Add",exact:true}).click();
    }
    await owner.getByTestId("button-create-stream").click();
    await owner.getByTestId("button-go-live").waitFor();
    const room=[...streams.values()].find(stream => stream.title === "Family live test");
    expect(room).toBeDefined();
    expect(room.isPublic).toBe(false);
    expect(room.status).toBe("pending");
    expect(acl.guests.has(`${room.id}:guest`)).toBe(true);
    expect(acl.guests.has(`${room.id}:guest-two`)).toBe(true);
    expect(await owner.evaluate(() => (window as any).mediaEvidence.tracks.length)).toBe(0);
    await owner.getByTestId("button-go-live").click();
    await owner.getByTestId("badge-live").waitFor();
    const outsider=await pageFor(viewerBrowser,"outsider");
    expect((await outsider.request.post(origin + `/api/streams/${room.id}/join`)).status()).toBe(403);
    expect((await (await outsider.request.get(origin + "/api/p2p/live")).json()).streams
      .some((item:any) => item.id === room.id)).toBe(false);
    // Foreground discovery is the real page's timer, not a navigation/reload.
    await viewer.getByTestId(`button-join-invited-${room.id}`).waitFor({timeout:15_000});
    expect(await viewer.evaluate(() => (window as any).mediaEvidence.peers.length)).toBe(0);
    await viewer.getByTestId(`button-join-invited-${room.id}`).click();
    await viewer.waitForFunction(() => {
      const video=document.querySelector("video");
      return !!video && video.videoWidth>0 && video.readyState>=2;
    },undefined,{timeout:30_000});
    await viewer.waitForFunction(async () => {
      for (const pc of (window as any).mediaEvidence.peers as RTCPeerConnection[]) {
        const stats=await pc.getStats();
        if ([...stats.values()].some(s => s.type === "inbound-rtp" && s.kind === "video" && s.framesDecoded>=8)) return true;
      }
      return false;
    },undefined,{timeout:30_000});
    revokeStreamGuest(room.id,"guest");
    acl.guests.delete(`${room.id}:guest`);
    await closed(viewer);
    await owner.getByTestId("button-close").click();
    await closed(owner,true);
  },60_000);

  it("stops late native camera permission results after unmount without opening signaling", async () => {
    await owner.goto(origin + "/streaming/private");
    // Delay delivery of a real browser capture result, not a fabricated stream.
    await owner.evaluate(() => { (window as any).fixtureHoldCapture = true; });
    await owner.getByTestId("button-go-live").click();
    await owner.waitForFunction(() => typeof (window as any).fixtureReleaseCapture === "function");
    await owner.evaluate(() => {
      (window as any).fixtureUnmount();
      (window as any).fixtureReleaseCapture();
    });
    await owner.waitForFunction(() => (window as any).mediaEvidence.tracks.every(({ track }: any) => track.readyState === "ended"));
    expect(await owner.evaluate(() => {
      const e = (window as any).mediaEvidence;
      return [e.sockets.length, e.peers.length, [...e.intervals.values()].filter(ms => ms === 1000 || ms === 60_000).length];
    })).toEqual([0, 0, 0]);
  }, 20_000);
});
