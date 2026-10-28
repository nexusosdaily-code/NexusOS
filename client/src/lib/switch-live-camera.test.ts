import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { switchLiveCamera } from "./switch-live-camera";

class Track {
  enabled = true;
  readyState = "live";
  constructor(public kind: string, public id: string, private facing?: string) {}
  getSettings() { return { facingMode: this.facing, deviceId: this.id }; }
  stop = vi.fn(() => { this.readyState = "ended"; });
}
class Media {
  constructor(public tracks: Track[] = []) {}
  getTracks() { return [...this.tracks]; }
  getVideoTracks() { return this.tracks.filter(track => track.kind === "video"); }
  getAudioTracks() { return this.tracks.filter(track => track.kind === "audio"); }
  addTrack(track: Track) { this.tracks.push(track); }
  removeTrack(track: Track) { this.tracks = this.tracks.filter(item => item !== track); }
}
const media = (stream: Media) => stream as unknown as MediaStream;

describe("live camera replacement", () => {
  beforeEach(() => { vi.stubGlobal("MediaStream", Media); });
  afterEach(() => { vi.unstubAllGlobals(); });
  function fixture() {
    const old = new Track("video", "front", "user"), audio = new Track("audio", "mic");
    const next = new Track("video", "rear", "environment");
    const combined = new Media([old, audio]);
    let current = true, published = new Media([old, audio]);
    const sender = {
      track: old,
      replaceTrack: vi.fn(async (track: Track) => { sender.track = track; }),
    };
    const pc = { connectionState: "connected", getSenders: () => [sender], close: vi.fn() };
    const peers = new Map([["viewer", pc as unknown as RTCPeerConnection]]);
    const capture = vi.fn(async () => media(new Media([next])));
    const input = {
      camera: media(published), combined: media(combined), peers,
      constraints: { width: { ideal: 1280 } }, facing: "user" as const,
      isCurrent: () => current, publishCamera: (stream: MediaStream) => { published = stream as unknown as Media; },
      getUserMedia: capture,
    };
    return { old, audio, next, combined, input, sender, capture, peers,
      end: () => {
        current = false;
        published.getTracks().forEach(track => track.stop());
        combined.getTracks().forEach(track => track.stop());
      },
      published: () => published,
    };
  }

  it("replaces all viewers' video and keeps the microphone and stream identity", async () => {
    const f = fixture();
    const other = { track: f.old, replaceTrack: vi.fn(async () => {}) };
    f.peers.set("second", { connectionState: "connected", getSenders: () => [other] } as unknown as RTCPeerConnection);
    expect(await switchLiveCamera(f.input)).toBe("environment");
    expect(f.capture).toHaveBeenCalledWith({
      video: { width: { ideal: 1280 }, facingMode: { exact: "environment" } }, audio: false,
    });
    expect(f.sender.replaceTrack).toHaveBeenCalledWith(f.next);
    expect(other.replaceTrack).toHaveBeenCalledWith(f.next);
    expect(f.combined.getVideoTracks()).toEqual([f.next]);
    expect(f.published().getAudioTracks()).toEqual([f.audio]);
    expect(f.audio.stop).not.toHaveBeenCalled();
    expect(f.old.stop).toHaveBeenCalledOnce();
    expect(f.next.stop).not.toHaveBeenCalled();
  });

  it("preserves camera-off and microphone-mute settings", async () => {
    const f = fixture(); f.old.enabled = false; f.audio.enabled = false;
    await switchLiveCamera(f.input);
    expect(f.next.enabled).toBe(false);
    expect(f.audio.enabled).toBe(false);
  });

  it("keeps the old camera and audio after a permission failure", async () => {
    const f = fixture();
    f.capture.mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"));
    await expect(switchLiveCamera(f.input)).rejects.toThrow("Denied");
    expect(f.old.stop).not.toHaveBeenCalled();
    expect(f.audio.stop).not.toHaveBeenCalled();
    expect(f.sender.replaceTrack).not.toHaveBeenCalled();
  });

  it("rejects a browser returning the same camera rather than claiming it switched", async () => {
    const f = fixture();
    const duplicate = new Track("video", "front", "user");
    f.capture.mockResolvedValueOnce(media(new Media([duplicate])));
    await expect(switchLiveCamera(f.input)).rejects.toThrow("other camera is not available");
    expect(duplicate.readyState).toBe("ended");
    expect(f.old.readyState).toBe("live");
    expect(f.audio.readyState).toBe("live");
    expect(f.sender.replaceTrack).not.toHaveBeenCalled();
  });

  it("releases only the video for exclusive mobile camera hardware", async () => {
    const f = fixture();
    f.capture.mockRejectedValueOnce(new DOMException("Busy", "NotReadableError"));
    await switchLiveCamera(f.input);
    expect(f.capture).toHaveBeenCalledTimes(2);
    expect(f.old.readyState).toBe("ended");
    expect(f.audio.readyState).toBe("live");
    expect(f.sender.track).toBe(f.next);
  });

  it("reopens the previous camera when exclusive-camera switching fails", async () => {
    const f = fixture();
    const restored = new Track("video", "front", "user");
    f.capture.mockRejectedValueOnce(new DOMException("Busy", "NotReadableError"))
      .mockRejectedValueOnce(new DOMException("Missing rear", "NotFoundError"))
      .mockResolvedValueOnce(media(new Media([restored])));
    await expect(switchLiveCamera(f.input)).rejects.toThrow("Missing rear");
    expect(f.capture.mock.calls[2]).toEqual([{ video: { width: { ideal: 1280 }, facingMode: { exact: "user" } }, audio: false }]);
    expect(f.combined.getVideoTracks()).toEqual([restored]);
    expect(f.sender.track).toBe(restored);
    expect(f.audio.readyState).toBe("live");
  });

  it("rolls back successful sender replacements when another sender rejects", async () => {
    const f = fixture();
    const failed = { track: f.old, replaceTrack: vi.fn(async (track: Track) => {
      if (track === f.next) throw new Error("Cannot renegotiate");
    }) };
    f.peers.set("failed", { connectionState: "connected", getSenders: () => [failed] } as unknown as RTCPeerConnection);
    await expect(switchLiveCamera(f.input)).rejects.toThrow("could not switch");
    expect(f.sender.track).toBe(f.old);
    expect(f.combined.getVideoTracks()).toEqual([f.old]);
    expect(f.old.readyState).toBe("live");
    expect(f.next.readyState).toBe("ended");
    expect(f.audio.readyState).toBe("live");
  });

  it("closes only an unrestorable peer and keeps the old camera for other viewers", async () => {
    const f = fixture();
    const broken = {
      connectionState: "connected",
      getSenders: () => [{ track: f.old, replaceTrack: vi.fn(async () => { throw new Error("Broken peer"); }) }],
      close: vi.fn(),
    };
    f.peers.set("broken", broken as unknown as RTCPeerConnection);
    await expect(switchLiveCamera(f.input)).rejects.toThrow("could not switch");
    expect(broken.close).toHaveBeenCalledOnce();
    expect(f.peers.has("broken")).toBe(false);
    expect(f.sender.track).toBe(f.old);
    expect(f.old.readyState).toBe("live");
    expect(f.audio.readyState).toBe("live");
    expect(f.next.readyState).toBe("ended");
  });

  it("stops late camera acquisition after broadcast termination without publishing it", async () => {
    const f = fixture();
    let resolve!: (stream: MediaStream) => void;
    f.capture.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const switching = switchLiveCamera(f.input);
    f.end(); resolve(media(new Media([f.next])));
    await expect(switching).rejects.toThrow("Broadcast ended");
    expect(f.next.readyState).toBe("ended");
    expect(f.sender.replaceTrack).not.toHaveBeenCalled();
  });

  it("stops both video tracks when termination happens during sender replacement", async () => {
    const f = fixture();
    let done!: () => void;
    f.sender.replaceTrack.mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
    const switching = switchLiveCamera(f.input);
    await vi.waitFor(() => expect(f.sender.replaceTrack).toHaveBeenCalledOnce());
    f.end(); done();
    await expect(switching).rejects.toThrow("Broadcast ended");
    expect(f.next.readyState).toBe("ended");
    expect(f.old.readyState).toBe("ended");
    expect(f.audio.readyState).toBe("ended");
  });

  it("uses the published new video for a viewer joining during replacement", async () => {
    const f = fixture();
    f.sender.replaceTrack.mockImplementationOnce(async () => {
      expect(f.combined.getVideoTracks()).toEqual([f.next]);
      f.peers.set("late-viewer", {
        connectionState: "connected",
        getSenders: () => [{ track: f.combined.getVideoTracks()[0] }],
      } as unknown as RTCPeerConnection);
    });
    await switchLiveCamera(f.input);
    expect(f.combined.getVideoTracks()).toEqual([f.next]);
  });
});
