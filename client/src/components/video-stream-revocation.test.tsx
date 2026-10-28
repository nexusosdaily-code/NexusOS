import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { VideoStreaming } from "./VideoStreaming";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("live media revocation",()=>{
  it("closes established peer media and clears the video when signaling access is closed",async()=>{
    const sockets: any[]=[],peers:any[]=[];
    class Socket {
      static OPEN=1; readyState=1; onmessage:any;onopen:any;onclose:any;onerror:any;
      send=vi.fn();close=vi.fn(()=>{this.readyState=3;});
      constructor(){sockets.push(this);}
    }
    class Peer {
      ontrack:any;onicecandidate:any;localDescription={type:"answer",sdp:"synthetic"};
      setRemoteDescription=vi.fn(async()=>{});createAnswer=vi.fn(async()=>this.localDescription);
      setLocalDescription=vi.fn(async()=>{});close=vi.fn();addIceCandidate=vi.fn(async()=>{});
      constructor(){peers.push(this);}
    }
    vi.stubGlobal("WebSocket",Socket);vi.stubGlobal("RTCPeerConnection",Peer);
    vi.stubGlobal("RTCSessionDescription",class {constructor(value:any){Object.assign(this,value);}});
    const {container}=render(<VideoStreaming streamId="fixture" mode="viewer"/>);
    await act(async()=>{await sockets[0].onmessage({data:JSON.stringify({type:"offer",payload:{type:"offer",sdp:"synthetic"}})});});
    expect(peers).toHaveLength(1);
    await act(async()=>{sockets[0].onclose({code:1008});});
    expect(peers[0].close).toHaveBeenCalledOnce();
    for(const video of container.querySelectorAll("video")) expect(video.srcObject).toBeNull();
  });
});
