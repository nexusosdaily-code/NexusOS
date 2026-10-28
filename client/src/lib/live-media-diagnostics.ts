// Deliberately exclude SDP, addresses, user IDs and raw browser error messages.
// These summaries can safely be shown to the other person during a device test.
export interface MediaNegotiationEvidence {
  phase: string;
  localCandidates: number;
  acceptedCandidates: number;
  rejectedCandidates: number;
}

export function newMediaEvidence(): MediaNegotiationEvidence {
  return { phase: "new", localCandidates: 0, acceptedCandidates: 0, rejectedCandidates: 0 };
}

export async function acceptMediaCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit,
  evidence: MediaNegotiationEvidence,
) {
  try {
    await pc.addIceCandidate(candidate);
    evidence.acceptedCandidates++;
  } catch {
    // One unsupported/stale candidate must not prevent sending the SDP answer
    // or trying the remaining routes. A rejected count is visible, not hidden.
    if (pc.signalingState !== "closed") evidence.rejectedCandidates++;
  }
}

export function mediaDiagnostic(
  pc: RTCPeerConnection,
  stats: RTCStatsReport,
  evidence: MediaNegotiationEvidence,
  receiving: boolean,
): string {
  let frames = 0, bytes = 0;
  const codecs = new Set<string>();
  let dtls = "not reported", pair = "not selected";
  stats.forEach(report => {
    if (report.type === "transport") {
      // Explicit allowlists: never display arbitrary stats values.
      if (["new", "connecting", "connected", "closed", "failed"].includes(report.dtlsState)) dtls = report.dtlsState;
      const selected = stats.get(report.selectedCandidatePairId);
      if (selected?.state === "succeeded") pair = "succeeded";
    }
    if (report.type !== (receiving ? "inbound-rtp" : "outbound-rtp")) return;
    const codec = stats.get(report.codecId);
    const knownCodec = /^(audio\/(?:opus|PCMU|PCMA|G722)|video\/(?:H264|H265|VP8|VP9|AV1))$/i;
    if (typeof codec?.mimeType === "string" && knownCodec.test(codec.mimeType)) codecs.add(codec.mimeType);
    if (report.kind === "video" || report.mediaType === "video") {
      frames += (receiving ? report.framesDecoded : report.framesEncoded) ?? 0;
      bytes += (receiving ? report.bytesReceived : report.bytesSent) ?? 0;
    }
  });
  return `Connection: ${pc.connectionState}; video: ${frames} frames, ${Math.round(bytes / 1024)} KB ${receiving ? "received" : "sent"}; ` +
    `SDP: ${evidence.phase} (${pc.signalingState}); ICE: ${pc.iceConnectionState}, gathering: ${pc.iceGatheringState}; ` +
    `local ICE: ${evidence.localCandidates}; remote ICE: ${evidence.acceptedCandidates} accepted, ${evidence.rejectedCandidates} rejected; ` +
    `pair: ${pair}; DTLS: ${dtls}; codecs: ${[...codecs].join(", ") || "not reported"}`;
}
