import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { VideoStreaming } from "./VideoStreaming";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function fixture(holdRemote = false) {
  const sockets: any[] = [], peers: any[] = [];
  let release = () => {};
  const remote = holdRemote ? new Promise<void>(resolve => { release = resolve; }) : Promise.resolve();
  class Socket {
    static OPEN = 1;
    readyState = 1;
    onmessage: any; onclose: any;
    send = vi.fn();
    close = vi.fn(() => { this.readyState = 3; });
    constructor() { sockets.push(this); }
  }
  class Peer {
    signalingState = "stable";
    addIceCandidate = vi.fn(async (candidate: any) => {
      if (candidate.candidate === "bad") throw new DOMException("Not supported", "OperationError");
    });
    setRemoteDescription = vi.fn(() => remote);
    createAnswer = vi.fn(async () => ({ type: "answer", sdp: "fixture" }));
    setLocalDescription = vi.fn(async () => {});
    close = vi.fn(() => { this.signalingState = "closed"; });
    constructor() { peers.push(this); }
  }
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("RTCPeerConnection", Peer);
  vi.stubGlobal("RTCSessionDescription", class { constructor(value: any) { Object.assign(this, value); } });
  render(<VideoStreaming streamId="fixture" mode="viewer" />);
  const send = (type: string, payload: any) => sockets[0].onmessage({ data: JSON.stringify({ type, payload }) });
  const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); };
  return { sockets, peers, send, settle, release };
}

describe("viewer negotiation survives individual ICE rejection", () => {
  it.each(["queued", "after offer"])("continues after a rejected %s candidate", async timing => {
    const f = fixture();
    if (timing === "queued") {
      f.send("ice-candidate", { candidate: "bad" });
      f.send("ice-candidate", { candidate: "good" });
    }
    f.send("offer", { type: "offer", sdp: "fixture" });
    await f.settle();
    if (timing === "after offer") {
      f.send("ice-candidate", { candidate: "bad" });
      f.send("ice-candidate", { candidate: "good" });
      await f.settle();
    }
    expect(f.peers[0].addIceCandidate.mock.calls.map((call: any[]) => call[0].candidate)).toEqual(["bad", "good"]);
    expect(f.peers[0].createAnswer).toHaveBeenCalledOnce();
    expect(f.sockets[0].send.mock.calls.map((call: any[]) => JSON.parse(call[0]).type)).toContain("answer");
    expect(document.body.textContent).not.toContain("could not be negotiated");
  });

  it("does not resume answering when access closes during setRemoteDescription", async () => {
    const f = fixture(true);
    f.send("offer", { type: "offer", sdp: "fixture" });
    await f.settle();
    expect(f.peers[0].setRemoteDescription).toHaveBeenCalledOnce();
    await act(async () => { f.sockets[0].readyState = 3; f.sockets[0].onclose(); f.release(); });
    await f.settle();
    expect(f.peers[0].close).toHaveBeenCalledOnce();
    expect(f.peers[0].createAnswer).not.toHaveBeenCalled();
    expect(f.sockets[0].send).not.toHaveBeenCalled();
  });
});
