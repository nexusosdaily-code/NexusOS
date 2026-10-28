import { sha256 } from "@noble/hashes/sha2.js";
import { P2P_CHUNK_BYTES, P2P_MAX_FILE_BYTES, type P2PFileInfo } from "@shared/p2p-files";

export class FileAccumulator {
  private chunks: ArrayBuffer[] = [];
  private hash = sha256.create();
  bytes = 0;
  constructor(readonly file: P2PFileInfo) {
    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > P2P_MAX_FILE_BYTES) throw new Error("Invalid file size");
  }
  append(chunk: ArrayBuffer) {
    const expected = Math.min(P2P_CHUNK_BYTES, this.file.size - this.bytes);
    if (chunk.byteLength === 0 || chunk.byteLength !== expected) {
      throw new Error("Received file exceeds its declared size or chunk limit");
    }
    this.hash.update(new Uint8Array(chunk));
    this.chunks.push(chunk);
    this.bytes += chunk.byteLength;
  }
  finish(digest: string): Blob {
    const actual = Array.from(this.hash.digest(), value => value.toString(16).padStart(2, "0")).join("");
    if (this.bytes !== this.file.size || digest !== actual) throw new Error("File integrity check failed");
    const blob = new Blob(this.chunks, { type: this.file.type || "application/octet-stream" });
    this.chunks = [];
    return blob;
  }
  clear() { this.chunks = []; this.hash.destroy(); }
}

type Options = {
  id: string; info: P2PFileInfo; file?: File;
  signal: (signal: RTCSessionDescriptionInit | RTCIceCandidateInit) => void;
  progress: (percent: number) => void;
  received: (blob: Blob) => void;
  failed: (message: string) => void;
};
/** Reliable ordered DTLS data channel, with bounded chunks and backpressure. */
export class P2PFileConnection {
  private pc: RTCPeerConnection;
  private dc?: RTCDataChannel;
  private accumulator?: FileAccumulator;
  private candidates: RTCIceCandidateInit[] = [];
  private ended = false;
  private verified = false;
  private timer?: ReturnType<typeof setTimeout>;
  private inbound = Promise.resolve();
  constructor(private options: Options) {
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    this.pc.onicecandidate = event => { if (event.candidate && !this.ended) options.signal(event.candidate.toJSON()); };
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === "failed" || this.pc.connectionState === "disconnected") {
        this.fail("Peer connection failed. This network may require a TURN relay.");
      }
    };
    this.pc.ondatachannel = event => {
      if (options.file || this.dc || event.channel.label !== options.id) {
        event.channel.close(); this.fail("Unexpected file channel"); return;
      }
      this.attachChannel(event.channel);
    };
    if (!options.file) this.accumulator = new FileAccumulator(options.info);
    this.touch();
  }
  private touch() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fail("Transfer stalled or recipient is unreachable"), 60_000);
  }
  private fail(message: string) {
    if (this.ended || this.verified) return;
    this.close();
    this.options.failed(message);
  }
  async start() {
    if (!this.options.file) return;
    this.attachChannel(this.pc.createDataChannel(this.options.id, { ordered: true }));
    const offer = await this.pc.createOffer();
    if (this.ended) return;
    await this.pc.setLocalDescription(offer);
    if (!this.ended) this.options.signal({ type: "offer", sdp: offer.sdp });
  }
  async signal(signal: RTCSessionDescriptionInit | RTCIceCandidateInit) {
    if (this.ended) return;
    try {
      if ("type" in signal) {
        if ((this.options.file && signal.type !== "answer") || (!this.options.file && signal.type !== "offer")) {
          throw new Error("Unexpected session description");
        }
        await this.pc.setRemoteDescription(signal);
        for (const candidate of this.candidates.splice(0)) await this.pc.addIceCandidate(candidate);
        if (!this.options.file) {
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          if (!this.ended) this.options.signal({ type: "answer", sdp: answer.sdp });
        }
      } else if (this.pc.remoteDescription) await this.pc.addIceCandidate(signal);
      else {
        if (this.candidates.length >= 128) throw new Error("Too many ICE candidates");
        this.candidates.push(signal);
      }
    } catch { this.fail("Unable to negotiate the peer connection"); }
  }
  private attachChannel(dc: RTCDataChannel) {
    this.dc = dc; dc.binaryType = "arraybuffer"; dc.bufferedAmountLowThreshold = 64 * 1024;
    dc.onopen = () => {
      this.touch();
      if (this.options.file) void this.sendFile().catch(() => this.fail("File transfer interrupted"));
    };
    dc.onerror = () => this.fail("Data channel failed");
    dc.onclose = () => { if (!this.verified) this.fail("Peer closed the transfer"); };
    dc.onmessage = event => {
      this.inbound = this.inbound.then(() => {
        if (this.ended || this.verified) return;
        if (!this.accumulator) throw new Error("Unexpected incoming file bytes");
        this.touch();
        if (typeof event.data === "string") {
          if (event.data.length > 160) throw new Error("Invalid completion message");
          const end = JSON.parse(event.data);
          if (end.type !== "end" || typeof end.sha256 !== "string") throw new Error("Missing file checksum");
          const blob = this.accumulator.finish(end.sha256);
          this.verified = true;
          if (this.timer) clearTimeout(this.timer);
          this.options.received(blob);
        } else {
          if (!(event.data instanceof ArrayBuffer)) throw new Error("Invalid binary chunk");
          this.accumulator.append(event.data);
          this.options.progress(this.options.info.size ? this.accumulator.bytes / this.options.info.size * 100 : 0);
        }
      }).catch(() => this.fail("Received file failed size or integrity validation"));
    };
  }
  private async sendFile() {
    const file = this.options.file!;
    const hash = sha256.create();
    try {
      for (let offset = 0; offset < file.size; offset += P2P_CHUNK_BYTES) {
        while (!this.ended && this.dc!.bufferedAmount > 256 * 1024) {
          await new Promise(resolve => setTimeout(resolve, 8));
        }
        if (this.ended || this.dc?.readyState !== "open") throw new Error("Transfer closed");
        const chunk = await file.slice(offset, offset + P2P_CHUNK_BYTES).arrayBuffer();
        if (this.ended || this.dc?.readyState !== "open") throw new Error("Transfer closed");
        hash.update(new Uint8Array(chunk));
        this.dc.send(chunk);
        this.touch();
        this.options.progress(file.size ? Math.min(99, (offset + chunk.byteLength) / file.size * 100) : 0);
      }
      if (this.ended || this.dc?.readyState !== "open") throw new Error("Transfer closed");
      const digest = Array.from(hash.digest(), value => value.toString(16).padStart(2, "0")).join("");
      this.dc.send(JSON.stringify({ type: "end", sha256: digest }));
    } finally { hash.destroy(); }
  }
  acknowledged() { this.verified = true; this.close(); }
  close() {
    this.ended = true;
    if (this.timer) clearTimeout(this.timer);
    this.accumulator?.clear();
    this.dc?.close(); this.pc.close();
  }
}
