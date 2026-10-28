import { expect, it } from "vitest";
import { sha256 } from "@noble/hashes/sha2.js";
import { FileAccumulator } from "../client/src/lib/p2p-file-transfer";
import { P2P_CHUNK_BYTES } from "../shared/p2p-files";
const digest = (bytes: Uint8Array) => Array.from(sha256(bytes), n => n.toString(16).padStart(2, "0")).join("");
it("reassembles exact arbitrary binary bytes rather than decoding them as text", async () => {
  const data = Uint8Array.from({ length: P2P_CHUNK_BYTES + 53 }, (_, i) => i % 256);
  const receiver = new FileAccumulator({ name: "video.mp4", type: "video/mp4", size: data.length });
  receiver.append(data.slice(0, P2P_CHUNK_BYTES).buffer);
  receiver.append(data.slice(P2P_CHUNK_BYTES).buffer);
  expect(new Uint8Array(await receiver.finish(digest(data)).arrayBuffer())).toEqual(data);
});
it("supports an empty file", () => {
  const receiver = new FileAccumulator({ name: "empty", type: "", size: 0 });
  expect(receiver.finish(digest(new Uint8Array())).size).toBe(0);
});
it("rejects truncated, changed, oversized and undeclared bytes", () => {
  const receiver = new FileAccumulator({ name: "file", type: "", size: 2 });
  expect(() => receiver.finish(digest(new Uint8Array()))).toThrow("integrity");
  const changed = new FileAccumulator({ name: "file", type: "", size: 1 });
  changed.append(new Uint8Array([2]).buffer);
  expect(() => changed.finish(digest(new Uint8Array([1])))).toThrow("integrity");
  const oversize = new FileAccumulator({ name: "file", type: "", size: 1 });
  expect(() => oversize.append(new Uint8Array([1, 2]).buffer)).toThrow("size");
  const chunk = new FileAccumulator({ name: "file", type: "", size: P2P_CHUNK_BYTES + 1 });
  expect(() => chunk.append(new ArrayBuffer(P2P_CHUNK_BYTES + 1))).toThrow("chunk");
  expect(() => new FileAccumulator({ name: "file", type: "", size: 0 }).append(new ArrayBuffer(0))).toThrow();
  expect(() => new FileAccumulator({ name: "file", type: "", size: 100 }).append(new ArrayBuffer(1))).toThrow();
});
