import { describe, expect, it, vi } from "vitest";
import { acceptMediaCandidate, mediaDiagnostic, newMediaEvidence } from "./live-media-diagnostics";

describe("live media candidate isolation and safe diagnostics", () => {
  it("counts a rejected candidate and still accepts the next candidate", async () => {
    const addIceCandidate = vi.fn()
      .mockRejectedValueOnce(new DOMException("private address", "OperationError"))
      .mockResolvedValueOnce(undefined);
    const pc = { signalingState: "stable", addIceCandidate } as unknown as RTCPeerConnection;
    const evidence = newMediaEvidence();
    await acceptMediaCandidate(pc, { candidate: "rejected" }, evidence);
    await acceptMediaCandidate(pc, { candidate: "accepted" }, evidence);
    expect(evidence).toMatchObject({ acceptedCandidates: 1, rejectedCandidates: 1 });
    expect(addIceCandidate).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(evidence)).not.toContain("private address");
  });

  it("does not misreport a closed peer as an incompatible candidate", async () => {
    const pc = { signalingState: "closed", addIceCandidate: vi.fn().mockRejectedValue(new Error()) };
    const evidence = newMediaEvidence();
    await acceptMediaCandidate(pc as unknown as RTCPeerConnection, {}, evidence);
    expect(evidence.rejectedCandidates).toBe(0);
  });

  it("separates transport, codecs and decoded/sent media without exposing network data", () => {
    const pc = {
      connectionState: "connected", signalingState: "stable",
      iceConnectionState: "connected", iceGatheringState: "complete",
    } as RTCPeerConnection;
    const stats = new Map([
      ["transport", { type: "transport", dtlsState: "connected", selectedCandidatePairId: "pair" }],
      ["pair", { state: "succeeded", localCandidateId: "secret-local" }],
      ["secret-local", { type: "local-candidate", address: "192.168.1.20", port: 1234 }],
      ["codec", { type: "codec", mimeType: "video/H264", sdpFmtpLine: "private SDP" }],
      ["audio-codec", { type: "codec", mimeType: "audio/opus" }],
      ["video", { type: "inbound-rtp", kind: "video", framesDecoded: 12, bytesReceived: 2048, codecId: "codec" }],
      ["audio", { type: "inbound-rtp", kind: "audio", codecId: "audio-codec" }],
      ["sent", { type: "outbound-rtp", kind: "video", framesEncoded: 30, bytesSent: 4096, codecId: "codec" }],
    ]) as unknown as RTCStatsReport;
    const evidence = { ...newMediaEvidence(), phase: "answer applied" };
    const receiving = mediaDiagnostic(pc, stats, evidence, true);
    expect(receiving).toContain("12 frames, 2 KB received");
    expect(receiving).toContain("SDP: answer applied (stable)");
    expect(receiving).toContain("pair: succeeded; DTLS: connected; codecs: video/H264, audio/opus");
    expect(receiving).not.toMatch(/192\.168|1234|secret-local|private SDP/);
    expect(mediaDiagnostic(pc, stats, evidence, false)).toContain("30 frames, 4 KB sent");
  });

  it("handles absent/older browser statistics and refuses arbitrary codec/transport strings", () => {
    const pc = { connectionState: "connecting", signalingState: "have-local-offer",
      iceConnectionState: "checking", iceGatheringState: "gathering" } as RTCPeerConnection;
    const stats = new Map([
      ["transport", { type: "transport", dtlsState: "private address" }],
      ["codec", { mimeType: "private SDP" }],
      ["video", { type: "inbound-rtp", mediaType: "video", codecId: "codec" }],
    ]) as unknown as RTCStatsReport;
    const text = mediaDiagnostic(pc, stats, newMediaEvidence(), true);
    expect(text).toContain("0 frames, 0 KB received");
    expect(text).toContain("ICE: checking, gathering: gathering");
    expect(text).toContain("DTLS: not reported; codecs: not reported");
    expect(text).not.toContain("private");
  });
});
