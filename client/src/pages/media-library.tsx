import { useState, useRef, useCallback, useEffect } from "react";
import { io as ioConnect } from "socket.io-client";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Upload, ArrowLeft, Mic, Film, Loader2, X,
  ChevronDown, ChevronUp, Database, Scale,
  CheckCircle2, AlertTriangle, Lock,
  Radio, Users, Play, Square, Wifi, WifiOff,
} from "lucide-react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface ConstitutionRule {
  rule: string;
  status: "ENFORCED" | "COMPLIANT" | "VIOLATED";
  ceiling: string | number | null;
  detail: string;
  compliant: boolean;
  feeNxt?: string;
  multiplier?: number;
  dominantUploader?: string | null;
  dominantPct?: number;
  userBand?: string;
}
interface MediaConstitutionData {
  enforcedAt: string;
  userBand: string;
  userNm: number;
  userPsi: string | null;
  totalFiles: number;
  rules: Record<string, ConstitutionRule>;
}

function statusColor(s: "ENFORCED" | "COMPLIANT" | "VIOLATED"): string {
  if (s === "ENFORCED") return "#818cf8";
  if (s === "COMPLIANT") return "#22c55e";
  return "#ef4444";
}
function StatusIcon({ s }: { s: "ENFORCED" | "COMPLIANT" | "VIOLATED" }) {
  if (s === "ENFORCED") return <Lock size={9} style={{ color: "#818cf8" }} />;
  if (s === "COMPLIANT") return <CheckCircle2 size={9} style={{ color: "#22c55e" }} />;
  return <AlertTriangle size={9} style={{ color: "#ef4444" }} />;
}

function MediaConstitutionPanel() {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<MediaConstitutionData>({
    queryKey: ["/api/media/constitution"],
    refetchInterval: 30_000,
  });

  const rules = data ? Object.entries(data.rules) : [];
  const violations = rules.filter(([, r]) => r.status === "VIOLATED").length;
  const allOk = violations === 0;
  const summaryColor = allOk ? "#22c55e" : "#ef4444";

  return (
    <div style={{ marginBottom: 20 }} data-testid="media-constitution-panel">
      {/* Collapsed bar — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "9px 14px", borderRadius: open ? "8px 8px 0 0" : 8,
          border: `1px solid ${summaryColor}30`,
          background: summaryColor + "08",
          cursor: "pointer", textAlign: "left",
          borderBottom: open ? `1px solid ${summaryColor}15` : undefined,
        }}
        data-testid="button-constitution-toggle"
      >
        <Scale size={11} style={{ color: summaryColor, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: summaryColor }}>
          Media Constitution
        </span>
        <span style={{ fontSize: 8.5, fontFamily: "monospace", color: summaryColor + "80" }}>
          · {rules.length} rules enforced
        </span>

        {isLoading ? (
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", marginLeft: 4 }}>
            loading…
          </span>
        ) : (
          <div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
            {rules.map(([ref, r]) => (
              <span key={ref} style={{
                fontSize: 7.5, fontFamily: "monospace", fontWeight: 700,
                padding: "1px 5px", borderRadius: 3,
                background: statusColor(r.status) + "18",
                color: statusColor(r.status),
                border: `1px solid ${statusColor(r.status)}30`,
              }}>
                {ref} {r.status}
              </span>
            ))}
          </div>
        )}

        {data && (
          <span style={{ marginLeft: "auto", fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", flexShrink: 0 }}>
            {data.userPsi} · {data.userBand} · {data.totalFiles} files
          </span>
        )}
        <span style={{ color: summaryColor + "60", flexShrink: 0 }}>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      {/* Expanded rules */}
      {open && data && (
        <div style={{
          border: `1px solid ${summaryColor}20`, borderTop: "none",
          borderRadius: "0 0 8px 8px",
          background: "rgba(0,0,0,0.35)",
          padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {/* User context */}
          <div style={{
            display: "flex", gap: 16, flexWrap: "wrap",
            padding: "7px 12px", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            fontSize: 8.5, fontFamily: "monospace",
            marginBottom: 4,
          }}>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>Your authority:</span>
            {[
              { label: "Band", val: data.userBand },
              { label: "Ψ channel", val: data.userPsi ?? "—" },
              { label: "λ", val: `${Number(data.userNm).toFixed(2)}nm` },
              { label: "Library files", val: String(data.totalFiles) },
              { label: "Constitution enforced", val: new Date(data.enforcedAt).toLocaleTimeString() },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: "flex", gap: 4 }}>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>{label}:</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Rule rows */}
          {rules.map(([ref, r]) => {
            const col = statusColor(r.status);
            return (
              <div key={ref} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "10px 14px", borderRadius: 7,
                border: `1px solid ${col}25`,
                background: col + "07",
              }}>
                {/* Ref + status */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 60 }}>
                  <span style={{ fontSize: 8.5, fontFamily: "monospace", fontWeight: 800, color: col }}>{ref}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <StatusIcon s={r.status} />
                    <span style={{ fontSize: 7.5, fontFamily: "monospace", color: col, fontWeight: 700 }}>{r.status}</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: 1, alignSelf: "stretch", background: col + "25", flexShrink: 0 }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace", marginBottom: 3 }}>
                    {r.rule}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", lineHeight: 1.5 }}>
                    {r.detail}
                  </div>
                  {r.ceiling !== null && (
                    <div style={{ marginTop: 4, fontSize: 8, color: col + "80", fontFamily: "monospace" }}>
                      ceiling: {typeof r.ceiling === "number" ? `${(r.ceiling * 100).toFixed(0)}%` : r.ceiling}
                    </div>
                  )}
                  {r.dominantPct !== undefined && r.dominantPct > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{
                        height: 3, borderRadius: 99,
                        background: "rgba(255,255,255,0.06)",
                        overflow: "hidden", maxWidth: 200,
                      }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          width: `${Math.min(r.dominantPct, 100)}%`,
                          background: r.dominantPct > 80 ? "#ef4444" : "#22c55e",
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: 7.5, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                        {r.dominantPct}% of library by {r.dominantUploader ?? "top uploader"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.12)", fontFamily: "monospace", marginTop: 4 }}>
            Media Constitution v1.0 · governed by WNSP Physics · linked to{" "}
            <Link href="/constitution">
              <span style={{ color: "rgba(167,139,250,0.4)", cursor: "pointer" }}>NexusOS Constitution</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function nmToColor(nm: number): string {
  if (nm < 450) return "#8b5cf6";
  if (nm < 490) return "#3b82f6";
  if (nm < 520) return "#06b6d4";
  if (nm < 565) return "#22c55e";
  if (nm < 590) return "#eab308";
  if (nm < 625) return "#f97316";
  return "#ef4444";
}
function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 490) return "KERNEL";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}
function deriveSpectral(name: string) {
  const code = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
  const wdm = code % 256;
  const oam = code % 50;
  const pol = code % 2 === 0 ? "H" : "V";
  const nm = 380 + (wdm / 255) * 400;
  return { wdm, oam, pol, nm: parseFloat(nm.toFixed(2)), psi: `Ψ(${wdm},${oam},${pol})` };
}
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
function fmtDate(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function isAudio(mimeType: string) { return mimeType.startsWith("audio/"); }

interface VideoRecord {
  id: string;
  uploaderId: string;
  uploaderName: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  duration: number | null;
  status: string;
  createdAt: string;
}

interface CastRecord {
  castId: string;
  videoId: string;
  title: string;
  mimeType: string;
  broadcasterId: string;
  broadcasterName: string;
  psiChannel: string;
  nm: number;
  startedAt: string;
  viewerCount: number;
}

// ── Live Casts Panel ──────────────────────────────────────────────────────────
function LiveCastsPanel({ onTuneIn, myUserId }: { onTuneIn: (cast: CastRecord) => void; myUserId?: number }) {
  const { data, isLoading } = useQuery<{ casts: CastRecord[] }>({
    queryKey: ["/api/media/casts"],
    refetchInterval: 5_000,
  });
  const casts = data?.casts ?? [];
  if (!isLoading && casts.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }} data-testid="live-casts-panel">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444", animation: "media-pulse 1s ease-in-out infinite" }} />
        <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: "#ef4444" }}>
          Live Transmissions
        </span>
        <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
          · {isLoading ? "…" : casts.length} active
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {casts.map(cast => {
          const col = nmToColor(cast.nm);
          const isOwn = String(myUserId) === cast.broadcasterId;
          return (
            <div key={cast.castId} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 8,
              border: `1px solid ${col}30`,
              background: col + "07",
            }} data-testid={`cast-row-${cast.castId}`}>
              <Radio size={11} style={{ color: col, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {cast.title}
                </div>
                <div style={{ fontSize: 8.5, color: col + "90", fontFamily: "monospace", marginTop: 2, display: "flex", gap: 10 }}>
                  <span>{cast.psiChannel} · λ={cast.nm}nm</span>
                  <span>by {cast.broadcasterName}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Users size={8} />{cast.viewerCount} watching
                  </span>
                </div>
              </div>
              {!isOwn && (
                <button
                  onClick={() => onTuneIn(cast)}
                  data-testid={`button-tune-in-${cast.castId}`}
                  style={{
                    padding: "6px 14px", borderRadius: 6, fontSize: 9.5,
                    fontFamily: "monospace", fontWeight: 700, cursor: "pointer",
                    background: col + "20", color: col,
                    border: `1px solid ${col}40`, flexShrink: 0,
                  }}
                >
                  Tune In
                </button>
              )}
              {isOwn && (
                <span style={{ fontSize: 8.5, fontFamily: "monospace", color: col, padding: "4px 10px",
                  border: `1px solid ${col}30`, borderRadius: 6 }}>Your broadcast</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Transmit Modal (Broadcaster) ──────────────────────────────────────────────
function TransmitModal({ item, onClose, onStarted }: { item: VideoRecord; onClose: () => void; onStarted?: () => void }) {
  const [castId, setCastId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "ended">("idle");
  const [viewerCount, setViewerCount] = useState(0);
  const [viewerNames, setViewerNames] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<ReturnType<typeof ioConnect> | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map()); // viewerSocketId → RTCPeerConnection
  const capturedStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const statusRef = useRef<"idle" | "starting" | "live" | "ended">("idle");
  const sp = deriveSpectral(item.filename);
  const col = nmToColor(sp.nm);
  const streamUrl = `/api/spectral-workspace/video/${item.id}/stream`;

  useEffect(() => { statusRef.current = status; }, [status]);

  const cleanup = useCallback(() => {
    pcsRef.current.forEach(pc => { try { pc.close(); } catch {} });
    pcsRef.current.clear();
    if (socketRef.current) { try { socketRef.current.disconnect(); } catch {} socketRef.current = null; }
    capturedStreamRef.current?.getTracks().forEach(t => t.stop());
    capturedStreamRef.current = null;
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
  }, []);

  useEffect(() => { return () => cleanup(); }, [cleanup]);

  const goLive = async () => {
    setErr(null); setStatus("starting");
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/media/cast/start", {
        method: "POST", credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ videoId: item.id, title: item.filename, mimeType: item.mimeType, psiChannel: sp.psi, nm: sp.nm }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to start cast");
      const { castId: cid } = await res.json();
      setCastId(cid);

      const socket = ioConnect(location.origin, { path: "/ws/p2p", reconnection: false });
      socketRef.current = socket;

      socket.once("connect", () => {
        socket.emit("cast:join", { token, castId: cid, role: "broadcaster" });
      });

      socket.on("cast:ready", () => {
        setStatus("live");
        onStarted?.();
        const vid = videoRef.current;
        if (vid) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
          try {
            const rawStream: MediaStream =
              (vid as any).captureStream
                ? (vid as any).captureStream()
                : (vid as any).mozCaptureStream?.() ?? null;

            if (rawStream) {
              // Web Audio API captures audio from the element even though the
              // preview <video> is muted (muted only silences local playback,
              // not the underlying signal we need to transmit).
              const audioCtx = new AudioContext();
              audioCtxRef.current = audioCtx;
              const source = audioCtx.createMediaElementSource(vid);
              const dest = audioCtx.createMediaStreamDestination();
              source.connect(dest);
              // Do NOT connect source → audioCtx.destination: broadcaster
              // doesn't need to hear their own video locally.
              capturedStreamRef.current = new MediaStream([
                ...rawStream.getVideoTracks(),
                ...dest.stream.getAudioTracks(),
              ]);
            }
          } catch {
            capturedStreamRef.current = (vid as any).mozCaptureStream?.() ?? null;
          }
        }
      });

      socket.on("cast:viewer-joined", async ({ viewerSocketId, viewerName, viewerCount: vc }: { viewerId: string; viewerSocketId: string; viewerName: string; viewerCount: number }) => {
        setViewerCount(vc);
        setViewerNames(prev => [...prev.filter(n => n !== viewerName), viewerName]);

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcsRef.current.set(viewerSocketId, pc);

        const stream = capturedStreamRef.current;
        if (stream) stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.onicecandidate = (ev) => {
          if (ev.candidate) socket.emit("cast:ice", { targetViewerSocketId: viewerSocketId, payload: ev.candidate });
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("cast:offer", { targetViewerSocketId: viewerSocketId, payload: offer });
      });

      socket.on("cast:answer", async ({ fromSocketId, payload }: { fromSocketId: string; payload: RTCSessionDescriptionInit }) => {
        const pc = pcsRef.current.get(fromSocketId);
        if (pc && pc.signalingState !== "stable") await pc.setRemoteDescription(new RTCSessionDescription(payload));
      });

      socket.on("cast:ice", async ({ fromSocketId, payload }: { fromSocketId: string; payload: RTCIceCandidateInit }) => {
        const pc = pcsRef.current.get(fromSocketId);
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload)).catch(() => {});
      });

      socket.on("cast:viewer-left", ({ viewerSocketId, viewerCount: vc }: { viewerId: string; viewerSocketId?: string; viewerCount: number }) => {
        setViewerCount(vc);
        if (viewerSocketId) { const pc = pcsRef.current.get(viewerSocketId); pc?.close(); pcsRef.current.delete(viewerSocketId); }
      });

      socket.on("cast:error", ({ message }: { message: string }) => {
        setErr(message); setStatus("idle");
      });

      socket.on("disconnect", () => {
        if (statusRef.current === "live") setStatus("ended");
      });

    } catch (ex: any) {
      setErr(ex.message ?? "Unknown error");
      setStatus("idle");
    }
  };

  const endCast = async () => {
    socketRef.current?.emit("cast:end");
    const _token = localStorage.getItem("auth_token");
    if (castId) await fetch(`/api/media/cast/${castId}/end`, {
      method: "DELETE", credentials: "include",
      headers: _token ? { "Authorization": `Bearer ${_token}` } : {},
    }).catch(() => {});
    cleanup();
    setStatus("ended");
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} data-testid="transmit-modal">
      <div style={{
        width: "min(700px, 95vw)", borderRadius: 14,
        border: `1px solid ${col}40`, background: "#0a0a12",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          borderBottom: `1px solid ${col}20`, background: col + "08" }}>
          <Radio size={12} style={{ color: status === "live" ? "#ef4444" : col }} />
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: col, flex: 1 }}>
            {status === "live" ? "TRANSMITTING LIVE" : "P2P Transmission"} · {item.filename}
          </span>
          {status === "live" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 99,
              border: "1px solid #ef444440", background: "#ef44440d" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", animation: "media-pulse 1s ease-in-out infinite" }} />
              <span style={{ fontSize: 8.5, fontFamily: "monospace", color: "#ef4444" }}>LIVE</span>
              <Users size={8} style={{ color: "#ef444490", marginLeft: 4 }} />
              <span style={{ fontSize: 8.5, fontFamily: "monospace", color: "#ef444490" }}>{viewerCount}</span>
            </div>
          )}
          <button onClick={status === "live" ? endCast : onClose}
            style={{ color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Video preview */}
          <video
            ref={videoRef}
            src={streamUrl}
            muted
            loop
            playsInline
            crossOrigin="anonymous"
            style={{
              width: "100%", maxHeight: 280, borderRadius: 8,
              border: `1px solid ${col}30`, background: "#000", display: "block",
              outline: status === "live" ? `2px solid #ef4444` : undefined,
            }}
            data-testid="transmit-video-preview"
          />

          {/* Spectral info */}
          <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 8.5, fontFamily: "monospace",
            color: "rgba(255,255,255,0.3)" }}>
            <span>{sp.psi}</span>
            <span>λ={sp.nm}nm</span>
            <span>{nmToBand(sp.nm)}</span>
            <span>{fmtSize(item.fileSize)}</span>
            <span style={{ color: col + "90" }}>E={((6.626e-34 * 2.998e8) / (sp.nm * 1e-9) / 1.602e-19).toFixed(2)} eV</span>
          </div>

          {/* Viewer list */}
          {status === "live" && viewerNames.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {viewerNames.map(n => (
                <span key={n} style={{ fontSize: 8.5, fontFamily: "monospace", padding: "2px 8px",
                  borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>
                  {n}
                </span>
              ))}
            </div>
          )}

          {err && <div style={{ marginTop: 8, fontSize: 9.5, color: "#f87171", fontFamily: "monospace" }}>{err}</div>}

          {/* Controls */}
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            {status === "idle" && (
              <button onClick={goLive} data-testid="button-go-live"
                style={{ padding: "9px 22px", borderRadius: 7, fontSize: 10.5, fontWeight: 700,
                  fontFamily: "monospace", cursor: "pointer", background: "#7c3aed", color: "#fff",
                  border: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <Radio size={11} /> Go Live
              </button>
            )}
            {status === "starting" && (
              <span style={{ fontSize: 10, fontFamily: "monospace", color: col + "80",
                display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Starting transmission…
              </span>
            )}
            {status === "live" && (
              <button onClick={endCast} data-testid="button-end-cast"
                style={{ padding: "9px 22px", borderRadius: 7, fontSize: 10.5, fontWeight: 700,
                  fontFamily: "monospace", cursor: "pointer", background: "#991b1b", color: "#fff",
                  border: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <Square size={11} /> End Transmission
              </button>
            )}
            <div style={{ fontSize: 8.5, fontFamily: "monospace", color: "rgba(255,255,255,0.2)",
              alignSelf: "center", lineHeight: 1.5 }}>
              {status === "idle" && "Your video will be streamed live via WebRTC · other users can tune in from the library"}
              {status === "live" && `Broadcasting via Ψ channel · ${viewerCount} peer${viewerCount !== 1 ? "s" : ""} receiving`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Viewer Modal ──────────────────────────────────────────────────────────────
function ViewerModal({ cast, onClose }: { cast: CastRecord; onClose: () => void }) {
  const [status, setStatus] = useState<"connecting" | "connected" | "ended">("connecting");
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<ReturnType<typeof ioConnect> | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const col = nmToColor(cast.nm);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) { setStatus("ended"); return; }

    const socket = ioConnect(location.origin, { path: "/ws/p2p", reconnection: false });
    socketRef.current = socket;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (videoRef.current) {
        videoRef.current.srcObject = e.streams[0];
        videoRef.current.play().catch(() => {});
        setStatus("connected");
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("cast:ice", { payload: e.candidate });
    };

    socket.once("connect", () => {
      socket.emit("cast:join", { token, castId: cast.castId, role: "viewer" });
    });

    socket.on("cast:offer", async ({ payload }: { payload: RTCSessionDescriptionInit }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("cast:answer", { payload: answer });
    });

    socket.on("cast:ice", async ({ payload }: { payload: RTCIceCandidateInit }) => {
      await pc.addIceCandidate(new RTCIceCandidate(payload)).catch(() => {});
    });

    socket.on("cast:ended", () => {
      setStatus("ended");
      pc.close();
      socket.disconnect();
    });

    socket.on("cast:error", () => setStatus("ended"));
    socket.on("disconnect", () => setStatus("ended"));

    return () => { pc.close(); socket.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cast.castId]);

  const handleClose = () => {
    socketRef.current?.emit("cast:leave");
    socketRef.current?.disconnect();
    pcRef.current?.close();
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} data-testid="viewer-modal">
      <div style={{
        width: "min(700px, 95vw)", borderRadius: 14,
        border: `1px solid ${col}40`, background: "#0a0a12",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          borderBottom: `1px solid ${col}20`, background: col + "08" }}>
          {status === "connecting" && <Wifi size={12} style={{ color: col, animation: "media-pulse 1s ease-in-out infinite" }} />}
          {status === "connected" && <Wifi size={12} style={{ color: "#22c55e" }} />}
          {status === "ended" && <WifiOff size={12} style={{ color: "#6b7280" }} />}
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: col, flex: 1 }}>
            {status === "connecting" ? "Tuning In…" : status === "connected" ? "Receiving Transmission" : "Transmission Ended"}
            {" · "}{cast.title}
          </span>
          <span style={{ fontSize: 8.5, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
            by {cast.broadcasterName} · {cast.psiChannel}
          </span>
          <button onClick={handleClose}
            style={{ color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {status === "connecting" && (
            <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 12, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
              <Loader2 size={22} style={{ animation: "spin 1s linear infinite", color: col }} />
              <span style={{ fontSize: 10 }}>Connecting to {cast.broadcasterName}'s Ψ channel…</span>
              <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.15)" }}>{cast.psiChannel} · λ={cast.nm}nm · E=hf negotiation</span>
            </div>
          )}

          {status === "ended" && (
            <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
              <WifiOff size={22} style={{ color: "#6b7280" }} />
              <span style={{ fontSize: 10 }}>Transmission has ended</span>
              <button onClick={handleClose} style={{ marginTop: 8, padding: "6px 16px", borderRadius: 6,
                fontSize: 9.5, fontFamily: "monospace", cursor: "pointer",
                background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Close
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            controls={status === "connected"}
            style={{
              width: "100%", maxHeight: 300, borderRadius: 8,
              border: `1px solid ${col}30`, background: "#000",
              outline: status === "connected" ? `2px solid #22c55e` : undefined,
              display: (status === "connecting" || status === "ended") ? "none" : "block",
            }}
            data-testid="viewer-video"
          />

          {status === "connected" && (
            <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 8.5, fontFamily: "monospace",
              color: "rgba(255,255,255,0.3)" }}>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>LIVE · P2P WebRTC</span>
              <span>{cast.psiChannel}</span>
              <span>λ={cast.nm}nm</span>
              <span>{cast.viewerCount} viewers</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaCard({
  item, isPlaying, onSelect, onTransmit,
}: { item: VideoRecord; isPlaying: boolean; onSelect: () => void; onTransmit: () => void }) {
  const sp = deriveSpectral(item.filename);
  const col = nmToColor(sp.nm);
  const audio = isAudio(item.mimeType);
  const Icon = audio ? Mic : Film;

  return (
    <div
      data-testid={`media-card-${item.id}`}
      style={{
        border: `1px solid ${isPlaying ? col + "80" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 10, overflow: "hidden",
        background: isPlaying ? col + "0e" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s ease",
        boxShadow: isPlaying ? `0 0 20px ${col}25` : "none",
      }}
    >
      {/* Thumbnail area — click to play */}
      <div
        onClick={onSelect}
        style={{
          height: 100, display: "flex", alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg, ${col}15, ${col}05)`,
          borderBottom: `1px solid ${col}20`, position: "relative", cursor: "pointer",
        }}
      >
        <Icon size={28} style={{ color: col + "80" }} />
        {isPlaying && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            width: 7, height: 7, borderRadius: "50%", background: col,
            boxShadow: `0 0 8px ${col}`,
            animation: "media-pulse 1s ease-in-out infinite",
          }} />
        )}
        <div style={{
          position: "absolute", bottom: 6, left: 8, right: 8,
          fontSize: 7.5, fontFamily: "monospace", color: col + "90",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>{sp.psi}</span>
          <span>{sp.nm}nm · {nmToBand(sp.nm)}</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 6 }}>
          {item.filename}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.3)", fontFamily: "monospace",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.uploaderName} · {fmtSize(item.fileSize)}
          </span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", flexShrink: 0 }}>
            {fmtDate(item.createdAt)}
          </span>
        </div>

        {/* Transmit button — only for video */}
        {!audio && (
          <button
            onClick={(e) => { e.stopPropagation(); onTransmit(); }}
            data-testid={`button-transmit-${item.id}`}
            style={{
              marginTop: 8, width: "100%", padding: "5px 0", borderRadius: 5,
              fontSize: 8.5, fontFamily: "monospace", fontWeight: 700, cursor: "pointer",
              background: "rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.7)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(239,68,68,0.7)"; }}
          >
            <Radio size={8} /> Transmit P2P
          </button>
        )}
      </div>
    </div>
  );
}

function InlinePlayer({ item, onClose }: { item: VideoRecord; onClose: () => void }) {
  const sp = deriveSpectral(item.filename);
  const col = nmToColor(sp.nm);
  const audio = isAudio(item.mimeType);
  const streamUrl = `/api/spectral-workspace/video/${item.id}/stream`;
  const [muted, setMuted] = useState(false);

  return (
    <div style={{
      border: `1px solid ${col}50`, borderRadius: 12,
      background: `linear-gradient(135deg, ${col}0a, rgba(0,0,0,0.6))`,
      overflow: "hidden", marginBottom: 20,
    }}>
      {/* Player header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        borderBottom: `1px solid ${col}20`,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: col,
          boxShadow: `0 0 10px ${col}`, animation: "media-pulse 1s ease-in-out infinite" }} />
        <span style={{ fontSize: 10, fontFamily: "monospace", color: col, fontWeight: 700 }}>
          {audio ? "AUDIO · " : "VIDEO · "}{sp.psi} · λ={sp.nm}nm · {nmToBand(sp.nm)}
        </span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", flex: 1 }}>
          {item.filename} · {fmtSize(item.fileSize)} · by {item.uploaderName}
        </span>
        <button onClick={onClose}
          style={{ color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
          data-testid="button-close-player">
          <X size={13} />
        </button>
      </div>

      {/* Media element */}
      <div style={{ padding: 16 }}>
        {audio ? (
          <audio
            controls
            autoPlay
            src={streamUrl}
            muted={muted}
            style={{ width: "100%", accentColor: col }}
            data-testid={`audio-player-${item.id}`}
          />
        ) : (
          <video
            controls
            autoPlay
            src={streamUrl}
            muted={muted}
            style={{
              width: "100%", maxHeight: 340, borderRadius: 8,
              border: `1px solid ${col}30`, background: "#000",
            }}
            data-testid={`video-player-${item.id}`}
          />
        )}

        {/* Spectral data bar */}
        <div style={{
          marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap",
          padding: "7px 12px", borderRadius: 6,
          border: `1px solid ${col}20`, background: col + "08",
          fontSize: 8.5, fontFamily: "monospace",
        }}>
          {[
            { label: "Ψ channel", val: sp.psi },
            { label: "λ", val: `${sp.nm}nm` },
            { label: "band", val: nmToBand(sp.nm) },
            { label: "E=hf", val: `${((6.626e-34 * 2.998e8) / (sp.nm * 1e-9) / 1.602e-19).toFixed(2)} eV` },
            { label: "uploader", val: item.uploaderName },
            { label: "size", val: fmtSize(item.fileSize) },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: "flex", gap: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.25)" }}>{label}:</span>
              <span style={{ color: col + "d0", fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file || !title.trim()) throw new Error("File and title required");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim());
      if (desc.trim()) fd.append("description", desc.trim());
      const res = await fetch("/api/spectral-workspace/video", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Upload failed"); }
      return res.json();
    },
    onSuccess: () => {
      setFile(null); setTitle(""); setDesc("");
      setExpanded(false);
      onUploaded();
    },
  });

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setExpanded(true); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); }
  }, [title]);

  const borderCol = dragging ? "#a78bfa" : "rgba(255,255,255,0.08)";

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !expanded && fileRef.current?.click()}
        style={{
          border: `1.5px dashed ${borderCol}`,
          borderRadius: 10, padding: "20px 24px",
          background: dragging ? "rgba(167,139,250,0.06)" : "rgba(255,255,255,0.01)",
          cursor: expanded ? "default" : "pointer",
          transition: "all 0.2s",
          display: "flex", alignItems: "center", gap: 14,
        }}
        data-testid="upload-dropzone"
      >
        <Upload size={18} style={{ color: dragging ? "#a78bfa" : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          {file ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#a78bfa", fontWeight: 600 }}>
                {file.name}
              </span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                {fmtSize(file.size)}
              </span>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); setExpanded(false); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 2 }}>
                <X size={11} />
              </button>
            </div>
          ) : (
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>
              Drop a video or audio file here, or click to browse
            </span>
          )}
          <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.15)", fontFamily: "monospace", marginTop: 3 }}>
            mp4 · webm · mov · mp3 · wav · ogg · m4a · up to 200MB · CE-encoded on upload
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setExpanded(f => !f); }}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer" }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <input ref={fileRef} type="file"
        accept="video/*,audio/*"
        style={{ display: "none" }}
        data-testid="input-file-upload"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) { setFile(f); setExpanded(true); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); }
        }}
      />

      {/* Upload form */}
      {expanded && (
        <div style={{
          marginTop: 10, border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8,
          padding: "14px 16px", background: "rgba(167,139,250,0.04)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace",
                display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Title *
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Spectral Physics Episode 1"
                data-testid="input-media-title"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5,
                  color: "#e2e8f0", fontSize: 11, fontFamily: "monospace",
                  padding: "7px 10px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace",
                display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Description
              </label>
              <input
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Optional description"
                data-testid="input-media-desc"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5,
                  color: "#e2e8f0", fontSize: 11, fontFamily: "monospace",
                  padding: "7px 10px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {mutation.isError && (
            <div style={{ fontSize: 10, color: "#f87171", fontFamily: "monospace" }}>
              {(mutation.error as Error).message}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => mutation.mutate()}
              disabled={!file || !title.trim() || mutation.isPending}
              data-testid="button-upload-submit"
              style={{
                padding: "8px 20px", borderRadius: 6, fontSize: 10,
                fontFamily: "monospace", fontWeight: 700, cursor: "pointer",
                background: (!file || !title.trim() || mutation.isPending) ? "rgba(167,139,250,0.2)" : "#7c3aed",
                color: (!file || !title.trim() || mutation.isPending) ? "rgba(255,255,255,0.3)" : "#fff",
                border: "none", display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s",
              }}
            >
              {mutation.isPending ? <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Encoding + Uploading…</> : "→ Upload to Spectral DB"}
            </button>
            {mutation.isPending && (
              <span style={{ fontSize: 9, color: "rgba(167,139,250,0.6)", fontFamily: "monospace" }}>
                CE-encoding title → Ψ channel → storing binary…
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type TabType = "all" | "video" | "audio";

export default function MediaLibraryPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("all");
  const [transmitItem, setTransmitItem] = useState<VideoRecord | null>(null);
  const [viewerCast, setViewerCast] = useState<CastRecord | null>(null);
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<{ videos: VideoRecord[]; count: number }>({
    queryKey: ["/api/spectral-workspace/videos"],
    refetchInterval: 30_000,
  });

  const videos = data?.videos ?? [];
  const filtered = videos.filter(v => {
    if (tab === "video") return !isAudio(v.mimeType);
    if (tab === "audio") return isAudio(v.mimeType);
    return true;
  });

  const activeItem = activeId ? videos.find(v => v.id === activeId) ?? null : null;
  const videoCount = videos.filter(v => !isAudio(v.mimeType)).length;
  const audioCount = videos.filter(v => isAudio(v.mimeType)).length;

  return (
    <div style={{
      minHeight: "100vh", background: "#050508", color: "#e2e8f0",
      fontFamily: "monospace",
    }}>
      <style>{`
        @keyframes media-pulse {
          0%,100% { opacity:0.6; transform:scale(1); }
          50%      { opacity:1;   transform:scale(1.35); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "1rem 1.5rem",
        display: "flex", alignItems: "center", gap: 16,
        background: "rgba(255,255,255,0.01)",
      }}>
        <Link href="/pipeline">
          <div style={{ display: "flex", alignItems: "center", gap: 6,
            color: "rgba(255,255,255,0.3)", fontSize: 10, cursor: "pointer",
            padding: "5px 10px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}>
            <ArrowLeft size={11} /> Pipeline
          </div>
        </Link>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 2,
            textTransform: "uppercase", letterSpacing: "0.12em" }}>
            NexusOS · Input Layer · Media
          </div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#f1f5f9", letterSpacing: "0.01em" }}>
            Spectral Media Library
          </h1>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", margin: "3px 0 0" }}>
            Upload videos and audio · CE-encoded on arrival · stored at Ψ channel addresses
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { icon: Film, label: "Videos", count: videoCount, col: "#a78bfa" },
            { icon: Mic, label: "Audio", count: audioCount, col: "#34d399" },
          ].map(({ icon: Icon, label, count, col }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 7,
              border: `1px solid ${col}25`, background: col + "0a",
            }}>
              <Icon size={11} style={{ color: col }} />
              <span style={{ fontSize: 10, fontFamily: "monospace", color: col + "d0" }}>{count} {label}</span>
            </div>
          ))}
          <Link href="/spectral-db">
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 7, cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)",
              fontSize: 10,
            }}>
              <Database size={11} /> Spectral DB
            </div>
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>

        {/* Live Transmissions */}
        <LiveCastsPanel
          onTuneIn={(cast) => setViewerCast(cast)}
          myUserId={user?.id as number | undefined}
        />

        {/* Media Constitution */}
        <MediaConstitutionPanel />

        {/* Upload zone */}
        <UploadZone onUploaded={() => { qc.invalidateQueries({ queryKey: ["/api/spectral-workspace/videos"] }); qc.invalidateQueries({ queryKey: ["/api/media/constitution"] }); }} />

        {/* Active player */}
        {activeItem && <InlinePlayer item={activeItem} onClose={() => setActiveId(null)} />}

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["all", "video", "audio"] as TabType[]).map(t => {
            const labels: Record<TabType, string> = { all: `All · ${videos.length}`, video: `Videos · ${videoCount}`, audio: `Audio / Podcasts · ${audioCount}` };
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                data-testid={`tab-${t}`}
                style={{
                  padding: "5px 14px", borderRadius: 99, fontSize: 9.5, fontFamily: "monospace",
                  cursor: "pointer", border: `1px solid ${active ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.07)"}`,
                  background: active ? "rgba(167,139,250,0.12)" : "transparent",
                  color: active ? "#a78bfa" : "rgba(255,255,255,0.3)",
                  transition: "all 0.15s",
                }}>
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* Media grid */}
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "3rem",
            justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            Loading spectral media library…
          </div>
        ) : error ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#f87171", fontSize: 11 }}>
            Failed to load media. Check your connection.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: "3rem", textAlign: "center",
            border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 10,
          }}>
            <Upload size={28} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
              {tab === "all" ? "No media uploaded yet" : tab === "video" ? "No videos yet" : "No audio or podcasts yet"}
            </div>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.1)", marginTop: 6, fontFamily: "monospace" }}>
              Use the upload zone above to add your first file
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}>
            {filtered.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                isPlaying={activeId === item.id}
                onSelect={() => setActiveId(prev => prev === item.id ? null : item.id)}
                onTransmit={() => setTransmitItem(item)}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div style={{
          marginTop: "2.5rem", paddingTop: "1.25rem",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          fontSize: 9, color: "rgba(255,255,255,0.15)", fontFamily: "monospace",
          display: "flex", gap: "2rem", flexWrap: "wrap",
        }}>
          <span>Each file title is CE-encoded → λ → Ψ channel address on upload</span>
          <span>Binary stored in PostgreSQL · served via HTTP Range requests</span>
          <span>Spectral fingerprint: SHA-256(content) ⊕ hex(λ_sender)</span>
          <span>P2P transmission via WebRTC · video.captureStream() → Ψ channel peers</span>
          <Link href="/pipeline"><span style={{ color: "rgba(167,139,250,0.4)", cursor: "pointer" }}>← Back to pipeline</span></Link>
        </div>
      </div>

      {/* Transmit Modal */}
      {transmitItem && (
        <TransmitModal
          item={transmitItem}
          onClose={() => { setTransmitItem(null); qc.invalidateQueries({ queryKey: ["/api/media/casts"] }); }}
          onStarted={() => qc.invalidateQueries({ queryKey: ["/api/media/casts"] })}
        />
      )}

      {/* Viewer Modal */}
      {viewerCast && (
        <ViewerModal
          cast={viewerCast}
          onClose={() => setViewerCast(null)}
        />
      )}
    </div>
  );
}
