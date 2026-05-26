import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import VideoStreaming from "@/components/VideoStreaming";
import {
  Radio, Eye, Plus, ArrowLeft, Users, Clock,
  Play, Video, Trash2, Zap, Globe, Lock, Signal, Wifi
} from "lucide-react";

// ── Physics helpers ───────────────────────────────────────────────────
function ceEncode(text: string) {
  const codes = text.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm  = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const thz = parseFloat((299792458 / (nm * 1e-9) / 1e12).toFixed(4));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  const psi = `Ψ(${wdm},${oam},${pol})`;
  const band =
    nm < 450 ? "VIOLET" : nm < 495 ? "BLUE" : nm < 520 ? "CYAN" :
    nm < 565 ? "GREEN"  : nm < 590 ? "YELLOW": nm < 625 ? "ORANGE" : "RED";
  return { nm, thz, wdm, oam, pol, psi, band };
}

function nmToHex(nm: number): string {
  if (nm < 450) return "#8b00ff";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#06b6d4";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}

function formatAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(startedAt: string) {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Types ─────────────────────────────────────────────────────────────
interface Stream {
  id: string;
  title: string;
  description?: string;
  status: string;
  viewerCount: number;
  quality: string;
  isPublic: boolean;
  startedAt?: string;
  createdAt: string;
  broadcaster?: { username: string };
}

// ── Spectral channel chip ─────────────────────────────────────────────
function PsiChip({ title, size = "sm" }: { title: string; size?: "sm" | "lg" }) {
  const enc = ceEncode(title);
  const col = nmToHex(enc.nm);
  const px  = size === "lg" ? "text-[11px]" : "text-[9px]";
  return (
    <div className={`flex items-center gap-1.5 font-mono ${px} px-2 py-0.5 rounded-full border`}
      style={{ borderColor: col + "40", background: col + "12", color: col }}>
      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: col }} />
      {enc.psi} · {enc.nm}nm · {enc.band}
    </div>
  );
}

// ── Live badge ────────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400">
      <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      LIVE
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function StreamingPage() {
  const { user } = useAuth();
  const token = localStorage.getItem("auth_token") || "";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/streaming/:streamId");

  const [tab, setTab] = useState<"browse" | "create" | "mine">("browse");
  const [liveStreams, setLiveStreams]   = useState<Stream[]>([]);
  const [myStreams,   setMyStreams]     = useState<Stream[]>([]);
  const [loading, setLoading]          = useState(true);
  const [activeStream, setActiveStream] = useState<{ id: string; mode: "broadcaster" | "viewer" } | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [title,  setTitle]  = useState("");
  const [desc,   setDesc]   = useState("");
  const [pub,    setPub]    = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchAll(); return () => stopHb(); }, []);
  useEffect(() => {
    if (match && params?.streamId) joinViewer(params.streamId);
  }, [match, params?.streamId]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [liveR, myR] = await Promise.all([
        fetch("/api/streams/live",  { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/streams/my",    { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (liveR.ok) setLiveStreams((await liveR.json()).streams ?? []);
      if (myR.ok)  setMyStreams((await myR.json()).streams ?? []);
    } catch {}
    setLoading(false);
  }

  async function createStream() {
    if (!token) { toast({ title: "Login required", description: "Log in first to go live.", variant: "destructive" }); return; }
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description: desc, isPublic: pub }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      const data = await res.json();
      setActiveStream({ id: data.stream.id, mode: "broadcaster" });
      setTitle(""); setDesc("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  }

  async function startBroadcast(id: string) {
    const res = await fetch(`/api/streams/${id}/start`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setActiveStream({ id, mode: "broadcaster" });
  }

  function stopHb() { if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; } }

  function startHb(id: string) {
    stopHb();
    heartbeatRef.current = setInterval(async () => {
      const r = await fetch(`/api/streams/${id}/heartbeat`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 402) { stopHb(); toast({ title: "NXT low", description: "Insufficient NXT to sustain stream", variant: "destructive" }); }
    }, 60_000);
  }

  async function joinViewer(id: string) {
    try {
      const r = await fetch(`/api/streams/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Not found");
      const d = await r.json();
      if (d.stream.status !== "live") { toast({ title: "Not live", variant: "destructive" }); return; }
      await fetch(`/api/streams/${id}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setActiveStream({ id, mode: "viewer" });
      startHb(id);
    } catch { toast({ title: "Failed to join", variant: "destructive" }); }
  }

  async function endStream() {
    if (!activeStream) return;
    await fetch(`/api/streams/${activeStream.id}/end`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    if (activeStream.mode === "viewer")
      fetch(`/api/streams/${activeStream.id}/leave`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    stopHb();
    setActiveStream(null);
    fetchAll();
  }

  async function deleteStream(id: string) {
    const r = await fetch(`/api/streams/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { toast({ title: "Deleted" }); fetchAll(); }
  }

  // ── Active broadcast view ─────────────────────────────────────────
  if (activeStream) {
    const stream = [...liveStreams, ...myStreams].find(s => s.id === activeStream.id);
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VideoStreaming
          streamId={activeStream.id}
          mode={activeStream.mode}
          token={token}
          streamTitle={stream?.title || "Live Stream"}
          onEnd={endStream}
        />
      </div>
    );
  }

  const enc = title.trim() ? ceEncode(title) : null;
  const col = enc ? nmToHex(enc.nm) : "#06b6d4";

  // ── Tab button ────────────────────────────────────────────────────
  const Tab = (id: typeof tab, label: string, Icon: any) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
        tab === id ? "bg-white/8 border border-white/15 text-white" : "text-white/30 hover:text-white/60"
      }`}
      data-testid={`tab-${id}`}
    >
      <Icon size={11} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "monospace" }}>

      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/")} className="text-white/30 hover:text-white/60 transition-colors" data-testid="button-back">
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-red-400" />
            <span className="text-sm font-bold tracking-wider text-red-400">SPECTRAL BROADCAST</span>
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">Open spectrum · physics-addressed · P2P encrypted</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] px-2 py-1 rounded border border-red-400/20 text-red-400/50">WNSP CE/SE v2.0</span>
          <span className="text-[8px] px-2 py-1 rounded border border-emerald-400/20 text-emerald-400/50">WebRTC P2P</span>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Hero strip */}
        <div className="border border-white/8 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="h-0.5 rounded-full mb-4" style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />
          <div className="grid grid-cols-3 gap-4">
            {[
              { Icon: Globe,  col: "#06b6d4", title: "Open Spectrum",    body: "Your stream broadcasts on a wavelength of light. No company controls the channel. No one can ban the physics." },
              { Icon: Zap,    col: "#ca8a04", title: "Physics Pricing",  body: "Stream fees computed from E=hf — the actual energy of your spectral signal, not a platform percentage cut." },
              { Icon: Lock,   col: "#a78bfa", title: "P2P Encrypted",   body: "WebRTC peer-to-peer — viewer connects directly to broadcaster. Zero middleman, zero central relay server." },
            ].map(({ Icon, col, title, body }) => (
              <div key={title} className="flex items-start gap-3 border border-white/5 rounded-lg p-3">
                <Icon size={13} style={{ color: col }} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold mb-1" style={{ color: col }}>{title}</div>
                  <div className="text-[9px] text-white/30 leading-relaxed">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {Tab("browse", "Browse Live", Radio)}
          {Tab("create", "Go Live",     Plus)}
          {Tab("mine",   "My Streams",  Video)}
        </div>

        {/* ── Browse ────────────────────────────────────────────────── */}
        {tab === "browse" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-white/30 uppercase tracking-widest">
                {loading ? "Loading…" : `${liveStreams.length} channel${liveStreams.length !== 1 ? "s" : ""} broadcasting now`}
              </div>
              <button
                onClick={fetchAll}
                className="text-[9px] text-white/30 hover:text-white/60 border border-white/10 rounded-lg px-3 py-1.5 transition-all"
                data-testid="button-refresh"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="border border-white/5 rounded-xl p-12 text-center text-white/20 text-[11px]">
                Scanning spectrum…
              </div>
            ) : liveStreams.length === 0 ? (
              <div className="border border-white/5 rounded-xl p-12 text-center space-y-3">
                <Radio size={32} className="mx-auto text-white/10" />
                <div className="text-white/25 text-[11px]">No channels live right now</div>
                <div className="text-white/15 text-[9px]">The spectrum is quiet. Be the first to broadcast.</div>
                <button
                  onClick={() => setTab("create")}
                  className="mt-2 text-[9px] border border-red-400/30 text-red-400/60 hover:text-red-400 rounded-lg px-4 py-2 transition-all"
                  data-testid="button-go-live-empty"
                >
                  Go Live →
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveStreams.map(s => {
                  const e = ceEncode(s.title);
                  const c = nmToHex(e.nm);
                  return (
                    <button
                      key={s.id}
                      onClick={() => joinViewer(s.id)}
                      className="border border-white/8 rounded-xl overflow-hidden text-left hover:border-white/20 transition-all group"
                      style={{ background: "rgba(255,255,255,0.01)" }}
                      data-testid={`card-stream-${s.id}`}
                    >
                      {/* Thumbnail area */}
                      <div className="aspect-video relative flex items-center justify-center border-b border-white/5"
                        style={{ background: `linear-gradient(135deg,${c}10,black)` }}>
                        <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: c + "60", background: c + "15" }}>
                          <Radio size={20} style={{ color: c }} />
                        </div>
                        <div className="absolute top-2 left-2"><LiveBadge /></div>
                        {s.startedAt && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] text-white/40 font-mono">
                            <Clock size={9} />{formatDuration(s.startedAt)}
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="h-0.5 rounded-full" style={{ background: c, opacity: 0.4 }} />
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3 space-y-2">
                        <div className="text-[11px] font-bold text-white truncate" data-testid={`text-stream-title-${s.id}`}>{s.title}</div>
                        <PsiChip title={s.title} />
                        <div className="flex items-center justify-between text-[9px] text-white/30">
                          <span className="font-mono">{s.broadcaster?.username ?? "anon"}</span>
                          <span className="flex items-center gap-1"><Eye size={9} /> {s.viewerCount}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Create ────────────────────────────────────────────────── */}
        {tab === "create" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left — form */}
            <div className="border border-white/8 rounded-xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-2">
                <Radio size={11} className="text-red-400" /> Start a Spectral Broadcast
              </div>

              {!token && (
                <div className="border border-yellow-400/20 rounded-lg p-3 text-[9px] text-yellow-400/70 flex items-center gap-2">
                  <Zap size={10} /> You must be logged in to go live.
                </div>
              )}

              <div className="space-y-1">
                <div className="text-[9px] text-white/30">Stream Title</div>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none placeholder-white/20 focus:border-white/25"
                  placeholder="What are you broadcasting today?"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  data-testid="input-stream-title"
                />
                <div className="text-[8px] text-white/15">Your title determines your wavelength — the physics of your words picks your frequency</div>
              </div>

              <div className="space-y-1">
                <div className="text-[9px] text-white/30">Description (optional)</div>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white outline-none placeholder-white/20 focus:border-white/25 resize-none h-20"
                  placeholder="Tell viewers what your stream is about…"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  data-testid="input-stream-description"
                />
              </div>

              <div className="flex items-center justify-between border border-white/5 rounded-lg px-3 py-2.5">
                <div>
                  <div className="text-[10px] text-white/60">Public stream</div>
                  <div className="text-[8px] text-white/20">Visible to all nodes on the network</div>
                </div>
                <button
                  onClick={() => setPub(p => !p)}
                  className={`w-10 h-5 rounded-full transition-all relative ${pub ? "bg-emerald-500/40 border border-emerald-400/40" : "bg-white/10 border border-white/10"}`}
                  data-testid="switch-public"
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${pub ? "left-5 bg-emerald-400" : "left-0.5 bg-white/30"}`} />
                </button>
              </div>

              <button
                onClick={createStream}
                disabled={creating || !title.trim()}
                className="w-full py-3 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#dc2626,#9333ea)", color: "#fff" }}
                data-testid="button-create-stream"
              >
                <Radio size={12} className="inline mr-2" />
                {creating ? "Connecting…" : "Go Live on Open Spectrum"}
              </button>
            </div>

            {/* Right — live spectral preview */}
            <div className="border border-white/8 rounded-xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-[10px] text-white/30 uppercase tracking-widest">Spectral Channel Preview</div>

              {enc ? (
                <div className="space-y-4">
                  {/* Colour bar */}
                  <div className="h-2 rounded-full" style={{ background: `linear-gradient(to right,${nmToHex(enc.nm - 40)},${col},${nmToHex(enc.nm + 40)})` }} />

                  {/* Big Ψ */}
                  <div className="border border-white/5 rounded-xl p-5 text-center" style={{ background: col + "08" }}>
                    <div className="text-3xl font-bold font-mono mb-1" style={{ color: col }}>{enc.psi}</div>
                    <div className="text-[9px] text-white/30">Your broadcast channel</div>
                  </div>

                  {/* Physics grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "λ emission",  value: `${enc.nm}nm`,     color: col },
                      { label: "Frequency",   value: `${enc.thz}THz`,   color: "#a78bfa" },
                      { label: "WDM",         value: String(enc.wdm),   color: "#f59e0b" },
                      { label: "OAM mode",    value: String(enc.oam),   color: "#f97316" },
                      { label: "Polarisation",value: enc.pol,           color: "#e879f9" },
                      { label: "Band",        value: enc.band,          color: col },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="border border-white/5 rounded-lg px-3 py-2">
                        <div className="text-[8px] text-white/25 mb-0.5">{label}</div>
                        <div className="text-[10px] font-bold font-mono" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border border-white/5 rounded-lg px-3 py-2">
                    <div className="text-[8px] text-white/25 mb-0.5">WNSP URI</div>
                    <div className="text-[9px] font-mono text-white/50 truncate">wnsp://{enc.psi}/{title.toLowerCase().replace(/\s+/g, "-")}</div>
                  </div>

                  <div className="text-[8px] text-white/15 leading-relaxed">
                    This channel is deterministic — derived from your title using CE→SE encoding. No two titles produce the same channel. It's unique to you.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <div className="h-1.5 w-full rounded-full" style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)", opacity: 0.3 }} />
                  <div className="text-white/15 text-[10px]">Enter a title to see your spectral channel</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── My Streams ────────────────────────────────────────────── */}
        {tab === "mine" && (
          <div className="space-y-3">
            <div className="text-[10px] text-white/30 uppercase tracking-widest">
              {myStreams.length === 0 ? "No broadcasts yet" : `${myStreams.length} broadcast${myStreams.length !== 1 ? "s" : ""}`}
            </div>

            {myStreams.length === 0 ? (
              <div className="border border-white/5 rounded-xl p-12 text-center space-y-3">
                <Video size={32} className="mx-auto text-white/10" />
                <div className="text-white/25 text-[11px]">You haven't broadcast yet</div>
                <button
                  onClick={() => setTab("create")}
                  className="text-[9px] border border-red-400/30 text-red-400/60 hover:text-red-400 rounded-lg px-4 py-2 transition-all"
                  data-testid="button-create-first"
                >
                  Go Live →
                </button>
              </div>
            ) : (
              myStreams.map(s => {
                const e = ceEncode(s.title);
                const c = nmToHex(e.nm);
                return (
                  <div
                    key={s.id}
                    className="border border-white/8 rounded-xl p-4 flex items-center gap-4"
                    style={{ background: "rgba(255,255,255,0.01)" }}
                    data-testid={`card-my-stream-${s.id}`}
                  >
                    {/* Colour dot */}
                    <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: c + "50", background: c + "12" }}>
                      <Radio size={14} style={{ color: c }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-white truncate">{s.title}</span>
                        <div className={`text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                          s.status === "live"
                            ? "border-red-400/40 text-red-400 bg-red-400/10"
                            : s.status === "ended"
                            ? "border-white/10 text-white/20"
                            : "border-amber-400/40 text-amber-400 bg-amber-400/10"
                        }`}>
                          {s.status}
                        </div>
                      </div>
                      <PsiChip title={s.title} />
                      <div className="text-[8px] text-white/20 mt-1.5 font-mono">
                        {formatAgo(s.createdAt)} · {s.isPublic ? "Public" : "Private"} · {s.quality}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.status === "pending" && (
                        <button
                          onClick={() => startBroadcast(s.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-red-400/40 text-red-400 hover:bg-red-400/10 transition-all"
                          data-testid={`button-start-${s.id}`}
                        >
                          <Play size={10} /> Start
                        </button>
                      )}
                      {s.status === "live" && (
                        <button
                          onClick={() => setActiveStream({ id: s.id, mode: "broadcaster" })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 transition-all"
                          data-testid={`button-resume-${s.id}`}
                        >
                          <Signal size={10} /> Resume
                        </button>
                      )}
                      {s.status !== "live" && (
                        <button
                          onClick={() => deleteStream(s.id)}
                          className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                          data-testid={`button-delete-${s.id}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border border-white/5 rounded-xl p-4 flex items-center gap-6 text-[9px] text-white/15">
          <div className="flex items-center gap-1.5"><Wifi size={10} /> P2P mesh — no central relay</div>
          <div className="flex items-center gap-1.5"><Zap size={10} /> Fees from E=hf physics</div>
          <div className="flex items-center gap-1.5"><Globe size={10} /> Open spectrum — no ban button</div>
          <div className="ml-auto font-mono">WNSP Spectral Broadcast v1.0</div>
        </div>

      </div>
    </div>
  );
}
