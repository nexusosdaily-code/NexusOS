import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoStreaming } from "./VideoStreaming";

describe("mobile live reception", () => {
  let sockets: any[], peers: any[], releaseDescription: (() => void) | undefined;
  let delayDescription: boolean, rejectDescription: boolean;
  const play = vi.fn(async () => {});
  beforeEach(() => {
    vi.useFakeTimers();
    sockets = []; peers = []; delayDescription = false; rejectDescription = false; releaseDescription = undefined;
    class Socket {
      static OPEN = 1; readyState = 1; onmessage: any; onopen: any; onclose: any;
      send = vi.fn(); close = vi.fn(() => { this.readyState = 3; });
      constructor() { sockets.push(this); }
    }
    class Peer {
      ontrack: any; onicecandidate: any; onconnectionstatechange: any;
      connectionState = "new";
      setRemoteDescription = vi.fn(async () => {
        if (rejectDescription) throw new Error("Invalid SDP");
        if (delayDescription) await new Promise<void>(resolve => { releaseDescription = resolve; });
      });
      createAnswer = vi.fn(async () => ({ type: "answer", sdp: "fixture" }));
      setLocalDescription = vi.fn(async () => {});
      addIceCandidate = vi.fn(async () => {});
      close = vi.fn();
      constructor() { peers.push(this); }
    }
    class Media {
      tracks: any[] = [];
      getTracks() { return this.tracks; }
      addTrack(track: any) { this.tracks.push(track); }
    }
    vi.stubGlobal("WebSocket", Socket);
    vi.stubGlobal("RTCPeerConnection", Peer);
    vi.stubGlobal("MediaStream", Media);
    vi.stubGlobal("RTCSessionDescription", class { constructor(value: any) { Object.assign(this, value); } });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
    const attached = new WeakMap<HTMLMediaElement, MediaProvider | null>();
    vi.spyOn(HTMLMediaElement.prototype, "srcObject", "set").mockImplementation(function (this: HTMLMediaElement, value) { attached.set(this, value); });
    vi.spyOn(HTMLMediaElement.prototype, "srcObject", "get").mockImplementation(function (this: HTMLMediaElement) { return attached.get(this) ?? null; });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); play.mockClear(); });
  const message = (type: string, payload: any = {}) => sockets[0].onmessage({ data: JSON.stringify({ type, payload }) });
  const settle = async () => { await act(async () => { await Promise.resolve(); }); };

  it("queues ICE before an offer and while the remote description is pending", async () => {
    render(<VideoStreaming streamId="fixture" mode="viewer" />);
    message("ice-candidate", { candidate: "early" });
    await settle();
    delayDescription = true;
    message("offer", { type: "offer", sdp: "fixture" });
    await settle();
    message("ice-candidate", { candidate: "during-description" });
    await settle();
    expect(peers[0].addIceCandidate).not.toHaveBeenCalled();
    await act(async () => { releaseDescription!(); });
    await settle();
    expect(peers[0].addIceCandidate.mock.calls.map((args: any[]) => args[0].candidate))
      .toEqual(["early", "during-description"]);
    expect(peers[0].createAnswer).toHaveBeenCalledOnce();
  });

  it("does not label readiness as received video, accepts streamless tracks, and enables sound by gesture", async () => {
    render(<VideoStreaming streamId="fixture" mode="viewer" />);
    message("broadcaster-ready");
    message("offer", { type: "offer", sdp: "fixture" });
    await settle();
    expect(screen.queryByTestId("badge-live")).toBeNull();
    const video = screen.getByTestId("video-viewer") as HTMLVideoElement;
    expect(video.muted).toBe(true);
    await act(async () => {
      peers[0].ontrack({ track: { id: "video", kind: "video" }, streams: [] });
      peers[0].ontrack({ track: { id: "audio", kind: "audio" }, streams: [] });
    });
    expect((video.srcObject as MediaStream).getTracks()).toHaveLength(2);
    expect(play).toHaveBeenCalled();
    expect(screen.queryByTestId("badge-live")).toBeNull();
    fireEvent.playing(video);
    expect(screen.getByTestId("badge-live")).toBeTruthy();
    fireEvent.click(screen.getByTestId("button-stream-sound"));
    expect(video.muted).toBe(false);
  });

  it("explains a missing connection rather than leaving a blank LIVE screen", async () => {
    render(<VideoStreaming streamId="fixture" mode="viewer" />);
    await act(async () => { vi.advanceTimersByTime(20_000); });
    expect(screen.getByTestId("stream-receive-status").textContent).toContain("No video has arrived");
    expect(screen.queryByTestId("badge-live")).toBeNull();
  });

  it("catches SDP negotiation failure without an unhandled promise rejection", async () => {
    rejectDescription = true;
    render(<VideoStreaming streamId="fixture" mode="viewer" />);
    message("offer", { type: "offer", sdp: "fixture" });
    await settle();
    expect(peers[0].setRemoteDescription).toHaveBeenCalledOnce();
    expect(peers[0].createAnswer).not.toHaveBeenCalled();
    expect(screen.getByTestId("stream-receive-status").textContent).toContain("could not be negotiated");
  });
});
