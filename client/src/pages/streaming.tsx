import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import VideoStreaming from "@/components/VideoStreaming";
import WaveRecipientPicker from "@/components/wave-recipient-picker";
import { BroadcastInviteError, createBroadcastRoom, inviteBroadcastGuests, type BroadcastType } from "@/lib/spectral-broadcast";
import {
  Radio, Eye, Plus, ArrowLeft, Users, Clock,
  Play, Video, Trash2, Zap, Globe, Lock, Signal, Wifi, Heart,
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
  streamType?: BroadcastType;
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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/streaming/:streamId");

  const [tab, setTab] = useState<"browse" | "create" | "mine">("browse");
  const [liveStreams, setLiveStreams]   = useState<Stream[]>([]);
  const [invitedRooms, setInvitedRooms] = useState<Array<{ id: string; title: string; broadcasterId: string; isPublic: boolean; status: string }>>([]);
  const [myStreams,   setMyStreams]     = useState<Stream[]>([]);
  const [loading, setLoading]          = useState(true);
  const [activeStream, setActiveStream] = useState<{ id: string; mode: "broadcaster" | "viewer" } | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tip state
  const [tipTarget, setTipTarget] = useState<{ username: string; streamId: string } | null>(null);
  const [tipSats, setTipSats] = useState("100");

  const { data: lnBal } = useQuery<{ satsBalance: number }>({
    queryKey: ["/api/lightning/balance"],
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const mySats = lnBal?.satsBalance ?? 0;

  const tipMut = useMutation({
    mutationFn: async ({ recipientUsername, amountSats }: { recipientUsername: string; amountSats: number }) => {
      const res = await apiRequest("POST", "/api/lightning/tip", { recipientUsername, amountSats, memo: `⚡ Tip on stream` });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({ title: "⚡ Tip sent!", description: `${vars.amountSats} sats → ${vars.recipientUsername}` });
      setTipTarget(null);
      setTipSats("100");
    },
    onError: (e: any) => toast({ title: "Tip failed", description: e.message }),
  });

  const [title,  setTitle]  = useState("");
  const [desc,   setDesc]   = useState("");
  const [pub,    setPub]    = useState(false);
  const [streamType, setStreamType] = useState<BroadcastType>("camera");
  const [inviteAddresses, setInviteAddresses] = useState<string[]>([]);
  const [inviteAddress, setInviteAddress] = useState("");
  const [pendingInvite, setPendingInvite] = useState<{ id: string; title: string; addresses: string[]; invited: string[] } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [discoveryError, setDiscoveryError] = useState("");
  const [invitedLoading, setInvitedLoading] = useState(false);
  const accountId = useRef(user?.id);
  const inviteSession = useRef(0);
  const broadcastSession = useRef(0);
  const broadcastController = useRef<AbortController | null>(null);
  const sessionAccount = useRef(user?.id);
  const refreshInvitedRef = useRef<() => void>(() => {});
  accountId.current = user?.id;
  const [creating, setCreating] = useState(false);

  useLayoutEffect(() => {
    const session = ++inviteSession.current;
    broadcastSession.current++;
    broadcastController.current?.abort();
    broadcastController.current = null;
    if (sessionAccount.current !== user?.id) {
      if (sessionAccount.current) {
        try { window.sessionStorage.removeItem(`nexusos:broadcast-pending:${sessionAccount.current}`); } catch {}
      }
      sessionAccount.current = user?.id;
    }
    accountId.current = user?.id;
    setLiveStreams([]);
    setMyStreams([]);
    setInvitedRooms([]);
    setInviteAddresses([]);
    setInviteAddress("");
    setPendingInvite(null);
    if (user?.id) {
      try {
        const saved = window.sessionStorage.getItem(`nexusos:broadcast-pending:${user.id}`);
        if (saved) {
          const parsed = JSON.parse(saved) as { id?: unknown; title?: unknown; addresses?: unknown; invited?: unknown };
          const addressesValid = Array.isArray(parsed.addresses) && parsed.addresses.every((value: unknown) => typeof value === "string");
          const invitedValid = Array.isArray(parsed.invited) && parsed.invited.every((value: unknown) => typeof value === "string");
          const valid = typeof parsed.id === "string" && typeof parsed.title === "string"
            && addressesValid && invitedValid
            && (parsed.invited as string[]).every(value => (parsed.addresses as string[]).includes(value));
          if (valid) setPendingInvite(parsed as { id: string; title: string; addresses: string[]; invited: string[] });
          else window.sessionStorage.removeItem(`nexusos:broadcast-pending:${user.id}`);
        }
      } catch {}
    }
    setInviteError("");
    setDiscoveryError("");
    setPub(false);
    setCreating(false);
    setTitle("");
    setDesc("");
    setActiveStream(null);
    stopHb();
    if (new URLSearchParams(window.location.search).get("create") === "private") {
      setTab("create");
      setPub(false);
    }
    const controller = new AbortController();
    const refreshInvited = async () => {
      setInvitedLoading(true);
      try {
        const response = await fetch("/api/p2p/live", { credentials: "include", cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Invited broadcasts could not be refreshed.");
        const data = await response.json();
        if (!controller.signal.aborted && inviteSession.current === session && accountId.current === user?.id) {
          setInvitedRooms(Array.isArray(data.streams) ? data.streams : []);
          setDiscoveryError("");
        }
      } catch {
        if (!controller.signal.aborted && inviteSession.current === session) setDiscoveryError("Could not refresh invited broadcasts. Retry to check access.");
      } finally {
        if (!controller.signal.aborted && inviteSession.current === session) setInvitedLoading(false);
      }
    };
    refreshInvitedRef.current = () => { void refreshInvited(); };
    void fetchAll();
    void refreshInvited();
    const interval = window.setInterval(() => { void refreshInvited(); }, 10_000);
    const onWake = () => { if (document.visibilityState === "visible") void refreshInvited(); };
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      controller.abort();
      broadcastController.current?.abort();
      inviteSession.current++;
      window.clearInterval(interval);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
      refreshInvitedRef.current = () => {};
      stopHb();
    };
  }, [user?.id]);
  useEffect(() => {
    if (match && params?.streamId) joinViewer(params.streamId);
  }, [match, params?.streamId]);

  async function fetchAll() {
    const expectedAccount = user?.id;
    setLoading(true);
    try {
      const [liveR, myR] = await Promise.all([
        fetch("/api/streams/live", { credentials: "include", cache: "no-store" }),
        fetch("/api/streams/my", { credentials: "include", cache: "no-store" }),
      ]);
      const [liveBody, myBody] = await Promise.all([liveR.ok ? liveR.json() : null, myR.ok ? myR.json() : null]);
      if (accountId.current === expectedAccount) {
        if (liveBody) setLiveStreams(liveBody.streams ?? []);
        if (myBody) setMyStreams(myBody.streams ?? []);
      }
    } catch {}
    if (accountId.current === expectedAccount) setLoading(false);
  }

  async function createStream() {
    if (!user) { toast({ title: "Login required", description: "Log in first to go live.", variant: "destructive" }); return; }
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (!pub && inviteAddresses.length === 0) { setInviteError("Add at least one recipient before creating a private broadcast."); return; }
    const ownerId = user?.id;
    const session = broadcastSession.current;
    const controller = new AbortController();
    broadcastController.current?.abort();
    broadcastController.current = controller;
    setCreating(true);
    setInviteError("");
    try {
      const data = await createBroadcastRoom({ title: title.trim(), description: desc.trim() || undefined, isPublic: pub, streamType }, controller.signal);
      if (controller.signal.aborted || session !== broadcastSession.current || accountId.current !== ownerId) return;
      const room = { id: data.stream.id, title: title.trim(), addresses: pub ? [] : [...inviteAddresses], invited: [] as string[] };
      if (!pub) {
        setPendingInvite(room);
        savePendingInvite(ownerId, room);
        try {
          room.invited = await inviteBroadcastGuests(room.id, room.addresses, controller.signal, invited => {
            room.invited = invited;
            const progress = { ...room, invited: [...invited] };
            setPendingInvite(progress);
            savePendingInvite(ownerId, progress);
          });
        } catch (error) {
          if (error instanceof BroadcastInviteError) room.invited = error.invited;
          if (controller.signal.aborted || session !== broadcastSession.current || accountId.current !== ownerId) return;
          const progress = { ...room, invited: [...room.invited] };
          setPendingInvite(progress);
          savePendingInvite(ownerId, progress);
          throw error;
        }
      }
      if (controller.signal.aborted || session !== broadcastSession.current || accountId.current !== ownerId) return;
      if (!pub) savePendingInvite(ownerId, null);
      setPendingInvite(null);
      setInviteAddresses([]); setTitle(""); setDesc("");
      setActiveStream({ id: data.stream.id, mode: "broadcaster" });
    } catch (e: any) {
      if (!controller.signal.aborted && session === broadcastSession.current && accountId.current === ownerId) {
        setInviteError(e.message || "Broadcast could not be prepared.");
        toast({ title: "Broadcast not started", description: e.message, variant: "destructive" });
      }
    } finally {
      if (broadcastController.current === controller) broadcastController.current = null;
      if (session === broadcastSession.current && accountId.current === ownerId) setCreating(false);
    }
  }

  async function retryInvites() {
    if (!pendingInvite || creating) return;
    const ownerId = user?.id;
    const session = broadcastSession.current;
    const controller = new AbortController();
    broadcastController.current?.abort();
    broadcastController.current = controller;
    setCreating(true);
    setInviteError("");
    const remaining = pendingInvite.addresses.filter(address => !pendingInvite.invited.includes(address));
    try {
      await inviteBroadcastGuests(pendingInvite.id, remaining, controller.signal, invited => {
        setPendingInvite(current => {
          if (!current || current.id !== pendingInvite.id) return current;
          const progress = { ...current, invited: [...current.invited, ...invited] };
          savePendingInvite(ownerId, progress);
          return progress;
        });
      });
      if (controller.signal.aborted || session !== broadcastSession.current || accountId.current !== ownerId) return;
      const room = pendingInvite;
      savePendingInvite(ownerId, null);
      setPendingInvite(null);
      setInviteAddresses([]);
      setTitle("");
      setDesc("");
      setActiveStream({ id: room.id, mode: "broadcaster" });
    } catch (error) {
      if (controller.signal.aborted || session !== broadcastSession.current || accountId.current !== ownerId) return;
      if (error instanceof BroadcastInviteError) {
        setPendingInvite(current => {
          if (!current) return current;
          const progress = { ...current, invited: [...new Set([...current.invited, ...error.invited])] };
          savePendingInvite(ownerId, progress);
          return progress;
        });
      }
      setInviteError(error instanceof Error ? error.message : "Invitation failed. Retry without creating another room.");
    } finally {
      if (broadcastController.current === controller) broadcastController.current = null;
      if (session === broadcastSession.current && accountId.current === ownerId) setCreating(false);
    }
  }

  const addExactRecipient = () => {
    const address = inviteAddress.trim();
    if (address && !inviteAddresses.includes(address)) setInviteAddresses(current => [...current, address]);
    setInviteAddress("");
  };

  const savePendingInvite = (ownerId: string | undefined, value: { id: string; title: string; addresses: string[]; invited: string[] } | null) => {
    if (!ownerId) return;
    try {
      const key = `nexusos:broadcast-pending:${ownerId}`;
      if (value) window.sessionStorage.setItem(key, JSON.stringify(value));
      else window.sessionStorage.removeItem(key);
    } catch { /* Session storage is optional; the current view still supports retry. */ }
  };

  async function startBroadcast(id: string) {
    const ownerId = user?.id;
    if (pendingInvite?.id === id) {
      setInviteError("Finish the remaining invitations before starting this private room.");
      return;
    }
    const stream = myStreams.find(item => item.id === id);
    if (stream && !stream.isPublic) {
      try {
        const response = await fetch(`/api/p2p/live/${encodeURIComponent(id)}/guests`, { credentials: "include", cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (accountId.current !== ownerId) return;
        if (!response.ok || !Array.isArray(body.guests) || body.guests.length === 0) {
          toast({ title: "Invite viewers first", description: "Manage this private room in P2P before starting the broadcast.", variant: "destructive" });
          return;
        }
      } catch {
        if (accountId.current !== ownerId) return;
        toast({ title: "Invitations unavailable", description: "Could not confirm this private room's viewers. It was not started.", variant: "destructive" });
        return;
      }
    }
    setActiveStream({ id, mode: "broadcaster" });
  }

  function stopHb() { if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; } }

  function startHb(id: string) {
    stopHb();
    heartbeatRef.current = setInterval(async () => {
      const r = await fetch(`/api/streams/${id}/heartbeat`, { method: "POST", credentials: "include" });
      if (!r.ok) { stopHb(); toast({ title: "Stream unavailable", description: "The stream ended or access is no longer available", variant: "destructive" }); }
    }, 60_000);
  }

  async function joinViewer(id: string) {
    const ownerId = user?.id;
    try {
      const r = await fetch(`/api/streams/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" });
      if (!r.ok) throw new Error("Not found");
      const d = await r.json();
      if (accountId.current !== ownerId) return;
      if (d.isOwner) {
        if (d.stream?.isPublic === false) {
          const access = await fetch(`/api/p2p/live/${encodeURIComponent(id)}/guests`, { credentials: "include", cache: "no-store" });
          const guestList = await access.json().catch(() => ({}));
          if (accountId.current !== ownerId) return;
          if (!access.ok || !Array.isArray(guestList.guests) || guestList.guests.length === 0) {
            toast({ title: "Invite viewers first", description: "Manage this private room in P2P before starting the broadcast.", variant: "destructive" });
            return;
          }
        }
        setActiveStream({ id, mode: "broadcaster" });
        return;
      }
      if (d.stream.status !== "live") { toast({ title: "Not live", variant: "destructive" }); return; }
      const joined = await fetch(`/api/streams/${encodeURIComponent(id)}/join`, { method: "POST", credentials: "include", cache: "no-store" });
      if (!joined.ok) throw new Error("Stream invitation or session unavailable");
      if (accountId.current !== ownerId) return;
      setActiveStream({ id, mode: "viewer" });
      startHb(id);
    } catch { toast({ title: "Failed to join", variant: "destructive" }); }
  }

  async function endStream() {
    if (!activeStream) return;
    stopHb();
    const action = activeStream.mode === "broadcaster" ? "end" : "leave";
    await fetch(`/api/streams/${activeStream.id}/${action}`, { method: "POST", credentials: "include" }).catch(() => {});
    setActiveStream(null);
    fetchAll();
  }

  async function deleteStream(id: string) {
    const r = await fetch(`/api/streams/${id}`, { method: "DELETE", credentials: "include" });
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
          initialSource={stream?.streamType ?? streamType}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {[
              { Icon: Globe,  col: "#06b6d4", title: "Software coordinates", body: "Wave addresses are software coordinates used to find accounts and rooms; they do not transmit media through light." },
              { Icon: Zap,    col: "#ca8a04", title: "Free live access",  body: "Opening and watching streams is free. Optional sats tips and purchases require explicit confirmation; no NXT viewing fees." },
              { Icon: Lock,   col: "#a78bfa", title: "Direct WebRTC media", body: "Live media uses a direct WebRTC connection when available. This setup has no TURN relay, so connections can fail." },
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {Tab("browse", "Browse Live", Radio)}
            {Tab("create", "Go Live",     Plus)}
            {Tab("mine",   "My Streams",  Video)}
          </div>
          <Link href="/live-guide" className="inline-flex min-h-10 items-center rounded-lg border border-emerald-300/20 px-3 text-[10px] font-semibold text-emerald-200/80 transition hover:bg-emerald-300/10 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" aria-label="Read How to go live">
            How to go live
          </Link>
        </div>

        {/* ── Browse ────────────────────────────────────────────────── */}
        {tab === "browse" && (
          <div className="space-y-4">
            {user && (
              <section className="border border-emerald-400/15 rounded-xl p-4 space-y-3" aria-label="Invited broadcasts" data-testid="invited-broadcasts">
                <div className="flex items-center justify-between gap-3">
                  <div><div className="text-[10px] uppercase tracking-widest text-emerald-300/70">Addressed to you</div><p className="mt-1 text-[9px] text-white/30">Private rooms appear here only when your account is invited. Joining is always your choice.</p></div>
                  <button type="button" onClick={() => refreshInvitedRef.current()} className="text-[9px] text-white/40 hover:text-white/80">Refresh</button>
                </div>
                {invitedLoading && invitedRooms.length === 0 ? <div className="h-12 animate-pulse rounded-lg bg-white/5" aria-label="Loading invited broadcasts" />
                  : invitedRooms.length ? <div className="space-y-2">{invitedRooms.filter(room => room.broadcasterId !== user.id).map(room =>
                    <div key={room.id} className="flex flex-col gap-3 rounded-lg border border-white/8 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`invited-room-${room.id}`}>
                      <div className="min-w-0"><div className="truncate text-[11px] font-bold">{room.title}</div><div className="mt-1 text-[9px] text-white/40">{room.status === "live" ? "Live now · ready when you are" : "Waiting for the broadcaster to start"} · {room.isPublic ? "Public room" : "Private invitation"}</div></div>
                      {room.status === "live" ? <button type="button" onClick={() => void joinViewer(room.id)} className="rounded-lg border border-emerald-300/30 px-3 py-2 text-[9px] font-bold text-emerald-200 hover:bg-emerald-300/10" data-testid={`button-join-invited-${room.id}`}>Join live</button> : <span className="text-[9px] text-amber-200/70">Waiting</span>}
                    </div>
                  )}</div> : <p className="rounded-lg border border-dashed border-white/10 px-4 py-5 text-center text-[10px] text-white/30">No invited rooms yet. New invitations will appear here automatically.</p>}
                {discoveryError && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-300/20 bg-rose-300/5 px-3 py-2 text-[9px] text-rose-200">{discoveryError}<button type="button" onClick={() => refreshInvitedRef.current()} className="shrink-0 underline">Retry refresh</button></div>}
              </section>
            )}
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
                  const isTipping = tipTarget?.streamId === s.id;
                  const canTip = !!user && !!s.broadcaster?.username && s.broadcaster.username !== user.username;
                  return (
                    <div
                      key={s.id}
                      className="border border-white/8 rounded-xl overflow-hidden text-left hover:border-white/20 transition-all group"
                      style={{ background: "rgba(255,255,255,0.01)" }}
                      data-testid={`card-stream-${s.id}`}
                    >
                      {/* Thumbnail — click to join */}
                      <div
                        className="aspect-video relative flex items-center justify-center border-b border-white/5 cursor-pointer"
                        style={{ background: `linear-gradient(135deg,${c}10,black)` }}
                        onClick={() => joinViewer(s.id)}
                      >
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
                        <div className="cursor-pointer" onClick={() => joinViewer(s.id)}>
                          <div className="text-[11px] font-bold text-white truncate" data-testid={`text-stream-title-${s.id}`}>{s.title}</div>
                          <div className="mt-1"><PsiChip title={s.title} /></div>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-white/30">
                          <span className="font-mono">{s.broadcaster?.username ?? "anon"}</span>
                          <span className="flex items-center gap-1"><Eye size={9} /> {s.viewerCount}</span>
                        </div>
                        {/* ⚡ Tip row */}
                        {canTip && (
                          <div className="pt-1.5 border-t border-white/5">
                            {isTipping ? (
                              <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                                <input
                                  type="number"
                                  value={tipSats}
                                  onChange={ev => setTipSats(ev.target.value)}
                                  className="w-20 bg-black/50 border border-pink-500/30 rounded px-2 py-1 text-[9px] font-mono text-white focus:outline-none"
                                  min="1"
                                  placeholder="sats"
                                  data-testid={`input-tip-sats-${s.id}`}
                                />
                                <button
                                  onClick={() => tipMut.mutate({ recipientUsername: s.broadcaster!.username!, amountSats: parseInt(tipSats) || 0 })}
                                  disabled={tipMut.isPending || (parseInt(tipSats) || 0) < 1 || (parseInt(tipSats) || 0) > mySats}
                                  className="px-2 py-1 rounded bg-pink-600/80 hover:bg-pink-600 text-[9px] font-bold text-white disabled:opacity-40 transition-colors"
                                  data-testid={`button-tip-send-${s.id}`}
                                >
                                  {tipMut.isPending ? "…" : "⚡ Send"}
                                </button>
                                <button onClick={() => setTipTarget(null)} className="text-white/30 hover:text-white/60 text-[9px] px-1">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setTipTarget({ username: s.broadcaster!.username!, streamId: s.id })}
                                className="flex items-center gap-1 text-[9px] text-pink-400/50 hover:text-pink-400 transition-colors"
                                data-testid={`button-tip-${s.id}`}
                              >
                                <Heart size={9} /> Tip with sats
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
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

              {!user && (
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
                  onClick={() => { setPub(p => { const next = !p; if (next) setInviteAddresses([]); return next; }); setInviteError(""); }}
                  className={`w-10 h-5 rounded-full transition-all relative ${pub ? "bg-emerald-500/40 border border-emerald-400/40" : "bg-white/10 border border-white/10"}`}
                  data-testid="switch-public"
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${pub ? "left-5 bg-emerald-400" : "left-0.5 bg-white/30"}`} />
                </button>
              </div>

              <label className="block space-y-1">
                <span className="text-[9px] text-white/30">Capture source</span>
                <select value={streamType} onChange={event => setStreamType(event.target.value as BroadcastType)} className="w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2.5 text-[11px] text-white outline-none focus:border-white/25" data-testid="select-stream-type">
                  <option value="camera">Camera</option><option value="screen">Screen</option><option value="both">Camera and screen</option>
                </select>
              </label>

              {!pub && <div className="space-y-3 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.025] p-3">
                <div><div className="text-[10px] font-bold text-emerald-200/80">Invite viewers before capture</div><p className="mt-1 text-[8px] leading-relaxed text-white/30">The room stays private. Grants are applied before camera or screen capture can begin.</p></div>
                <WaveRecipientPicker isAuthenticated={!!user} accountKey={user?.id} onSelect={address => setInviteAddresses(current => current.includes(address) ? current : [...current, address])} />
                <div className="flex gap-2">
                  <input value={inviteAddress} onChange={event => setInviteAddress(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addExactRecipient(); } }} placeholder="Or enter an exact wave address" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[10px] text-white outline-none focus:border-white/25" data-testid="input-broadcast-address" />
                  <button type="button" onClick={addExactRecipient} disabled={!inviteAddress.trim()} className="rounded-lg border border-white/10 px-3 text-[9px] text-white/70 disabled:opacity-40">Add</button>
                </div>
                {inviteAddresses.length > 0 && <ul className="space-y-1">{inviteAddresses.map(address => <li key={address} className="flex items-center justify-between gap-2 rounded bg-black/25 px-2 py-1.5 text-[9px] text-white/70"><span className="min-w-0 break-all font-mono">{address}</span><button type="button" onClick={() => setInviteAddresses(list => list.filter(item => item !== address))} className="shrink-0 text-white/40 hover:text-white" aria-label={`Remove ${address}`}>Remove</button></li>)}</ul>}
              </div>}

              {pendingInvite && <div role="alert" className="rounded-lg border border-amber-300/25 bg-amber-300/5 p-3 text-[9px] text-amber-100/80" data-testid="broadcast-invite-retry">
                <p>Private room “{pendingInvite.title}” was created, but not all invitations were applied. Capture has not started. Retry below to finish invitations on this same room; no duplicate room will be created.</p>
                <p className="mt-1">{pendingInvite.invited.length} of {pendingInvite.addresses.length} invited.</p>
                <button type="button" disabled={creating} onClick={() => void retryInvites()} className="mt-2 rounded-lg border border-amber-200/30 px-3 py-2 font-bold disabled:opacity-50">{creating ? "Applying invitations…" : "Retry remaining invitations"}</button>
              </div>}
              {inviteError && !pendingInvite && <p role="alert" className="text-[9px] text-rose-300">{inviteError}</p>}

              <button
                onClick={createStream}
                disabled={creating || !title.trim() || !!pendingInvite || (!pub && inviteAddresses.length === 0)}
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
                      {s.status === "pending" && s.isPublic && (
                        <button
                          onClick={() => startBroadcast(s.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-red-400/40 text-red-400 hover:bg-red-400/10 transition-all"
                          data-testid={`button-start-${s.id}`}
                        >
                          <Play size={10} /> Start
                        </button>
                      )}
                      {s.status === "pending" && !s.isPublic && <Link href="/p2p" className="flex items-center gap-1.5 rounded-lg border border-amber-300/30 px-3 py-1.5 text-[10px] font-bold text-amber-200 hover:bg-amber-300/10">Manage invites</Link>}
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
          <div className="flex items-center gap-1.5"><Zap size={10} /> Free viewing · optional sats support</div>
          <div className="flex items-center gap-1.5"><Globe size={10} /> Open spectrum — no ban button</div>
          <div className="ml-auto font-mono">WNSP Spectral Broadcast v1.0</div>
        </div>

      </div>
    </div>
  );
}
