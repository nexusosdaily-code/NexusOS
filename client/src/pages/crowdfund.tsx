import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useState } from "react";
import { Link } from "wouter";
import { getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TelegramVideoGallery from "@/components/TelegramVideoGallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Radio, Zap, Cpu, Globe, Shield, Code2, BookOpen,
  ArrowRight, Check, ExternalLink, Layers, Activity,
  Waves, Lock, Star, Users, ChevronDown, ChevronUp,
  TrendingUp, Briefcase, Award, Scale, Copy, Send,
  FileText, Github, MessageCircle, Rss, Bitcoin, Twitter,
  Clock, Calendar, Trash2, Play, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";

function wlToRgb(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) { r = 1; }
  return `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
}

const TIERS = [
  {
    name: "Photon",
    nxt: "100 NXT",
    sats: "100,000 sats",
    units: 100,
    shares: "100 Nexus Shares",
    shareClass: "Class C — Community",
    color: "#a78bfa",
    nm: 420,
    icon: Zap,
    seat: false,
    perks: [
      "100 Nexus Shares issued on-chain at your Ψ channel",
      "Your name CE→SE encoded at your personal wavelength",
      "Founder badge permanently on-chain",
      "AGPL-3.0 contributor credit in every release",
      "Share register entry — verifiable on blockchain",
    ],
    availability: "Unlimited",
  },
  {
    name: "Resonator",
    nxt: "1,000 NXT",
    sats: "1M sats",
    units: 1000,
    shares: "1,000 Nexus Shares",
    shareClass: "Class C — Community",
    color: "#34d399",
    nm: 520,
    icon: Waves,
    seat: false,
    perks: [
      "1,000 Nexus Shares issued on-chain",
      "Everything in Photon tier",
      "Name inscribed into a permanent blockchain block",
      "Block hash timestamped at your contribution wavelength",
      "Early access to WavelengthScript SDK (pre-release)",
    ],
    availability: "Unlimited",
  },
  {
    name: "Kernel Agent",
    nxt: "10,000 NXT",
    sats: "10M sats",
    units: 10000,
    shares: "10,000 Nexus Shares",
    shareClass: "Class B — Developer",
    color: "#fbbf24",
    nm: 560,
    icon: Cpu,
    seat: false,
    perks: [
      "10,000 Nexus Shares (Class B — Developer)",
      "Everything in Resonator tier",
      "Dedicated named Ψ channel reserved in the Kernel",
      "Named agent entry in the live Agent Bus",
      "Access to private R&D development channel",
      "Quarterly shareholder update reports",
    ],
    availability: "100 slots",
  },
  {
    name: "Hardware Founder",
    nxt: "100,000 NXT",
    sats: "100M sats",
    units: 100000,
    shares: "100,000 Nexus Shares",
    shareClass: "Class A — Hardware Founder",
    color: "#f87171",
    nm: 620,
    icon: Radio,
    seat: true,
    seatDesc: "Hardware Advisory Seat",
    perks: [
      "100,000 Nexus Shares (Class A — Hardware Founder)",
      "Everything in Kernel Agent tier",
      "PHR-1 resonator hardware prototype (first production batch)",
      "144-turn bifilar coil kit",
      "ZERO-G state demonstration access",
      "Seat at the hardware development table",
      "Vote on hardware roadmap priorities",
      "Quarterly hardware calls with the core team",
      "Revenue share from hardware sales (Orbital Treasury)",
    ],
    availability: "25 slots",
    highlight: true,
  },
  {
    name: "Nexus Partner",
    nxt: "1,000,000 NXT",
    sats: "1B sats",
    units: 1000000,
    shares: "1,000,000 Nexus Shares",
    shareClass: "Class A+ — Strategic Partner",
    color: "#60a5fa",
    nm: 460,
    icon: Star,
    seat: true,
    seatDesc: "Strategic Board Seat",
    perks: [
      "1,000,000 Nexus Shares (Class A+ — Strategic Partner)",
      "Everything in Hardware Founder tier",
      "Full strategic board seat — vote on all major decisions",
      "Named co-developer in AGPL-3.0 source headers",
      "Revenue share from Nexus Charitable Trust (10% bucket)",
      "Custom Ψ channel range reserved for your organisation",
      "Priority access to any future public listing allocation",
      "Direct line to the founding team",
    ],
    availability: "5 slots",
  },
];

const ROADMAP = [
  {
    phase: "Phase 0 — Proof of Physics",
    status: "COMPLETE",
    color: "#34d399",
    items: [
      "Λ=hf/c² equation validated on-chain",
      "CE→SE encoding standard published (AGPL-3.0)",
      "Block #4 'angry birds' 25MB at Ψ(211,35,H) 534.51nm",
      "479 spectral records, 6 kernel agents live",
      "WNSP/7.1 physics engine deployed",
    ],
  },
  {
    phase: "Phase 1 — Hardware Prototype",
    status: "FUNDING NOW",
    color: "#f87171",
    items: [
      "PHR-1 resonator board (144-turn bifilar coil)",
      "Syncbox Controller firmware",
      "ZERO-G state demonstration (gravity de-correlation)",
      "CZC catch basin hardware implementation",
      "First 25 Hardware Founder units manufactured",
    ],
  },
  {
    phase: "Phase 2 — Communication Network",
    status: "NEXT",
    color: "#a78bfa",
    items: [
      "Spectral Relay Mesh (10 physical nodes)",
      "OAM Channel Allocator hardware",
      "P2P communication over wavelength addresses — no DNS",
      "WavelengthScript v1.0 compiler release",
      "Open developer SDK (Python, JS, Rust)",
    ],
  },
  {
    phase: "Phase 3 — Planetary & Public Listing",
    status: "ROADMAP",
    color: "#60a5fa",
    items: [
      "Orbital Solar Array photonic feed",
      "Schumann resonance (7.83 Hz) planetary sync",
      "555 THz first oscillation energy extraction",
      "K1 Energy Market live trading",
      "NexusOS public company listing — NXT as traded asset",
    ],
  },
];

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4 rounded-xl border" style={{ borderColor: color + "40", background: color + "10" }}>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ── Post Scheduler Types ──────────────────────────────────────────────────────
interface ScheduledPost {
  id: string;
  title: string;
  body: string;
  emoji: string;
  hashtags: string[];
  platforms: string[];
  scheduledAt: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  sentAt: string | null;
  result: any;
  createdAt: string;
}

const EMOJI_OPTIONS = ["📡", "⚡", "🔬", "🏗️", "🌐", "🔶", "🪙", "💎", "🚀", "🛰️", "🌊", "🔭"];
const DEFAULT_HASHTAGS = ["NexusOS", "Bitcoin", "WNSP", "Photonics"];

function PostSchedulerPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emoji, setEmoji] = useState("📡");
  const [hashtagInput, setHashtagInput] = useState(DEFAULT_HASHTAGS.join(", "));
  const [scheduledAt, setScheduledAt] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["nostr", "telegram", "discord"]);

  const { data: posts = [], isLoading } = useQuery<ScheduledPost[]>({
    queryKey: ["/api/scheduled-posts"],
    queryFn: async () => {
      const r = await fetch("/api/scheduled-posts", { headers: getAuthHeaders() });
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const createMut = useMutation({
    mutationFn: async (payload: object) => {
      const r = await fetch("/api/scheduled-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
      toast({ title: "Post scheduled", description: "Will fire automatically at the selected time." });
      setTitle(""); setBody(""); setScheduledAt("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/scheduled-posts/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
      toast({ title: "Post cancelled" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fireNowMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/scheduled-posts/${id}/fire-now`, { method: "POST", headers: getAuthHeaders() });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
      toast({ title: "Post fired!", description: "Broadcast sent to all platforms." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  function handleSchedule() {
    if (!title.trim() || !body.trim() || !scheduledAt) {
      toast({ title: "Missing fields", description: "Title, body, and time are required.", variant: "destructive" });
      return;
    }
    const tags = hashtagInput.split(",").map(t => t.trim()).filter(Boolean);
    createMut.mutate({ title, body, emoji, hashtags: tags, platforms, scheduledAt });
  }

  // Local min datetime (next minute)
  const minDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  const pending = posts.filter(p => p.status === "pending");
  const history = posts.filter(p => p.status !== "pending");

  function statusIcon(s: string) {
    if (s === "sent") return <CheckCircle2 size={12} className="text-green-400" />;
    if (s === "failed") return <XCircle size={12} className="text-red-400" />;
    if (s === "cancelled") return <AlertCircle size={12} className="text-gray-500" />;
    return <Clock size={12} className="text-amber-400" />;
  }

  function statusColor(s: string) {
    if (s === "sent") return "text-green-400";
    if (s === "failed") return "text-red-400";
    if (s === "cancelled") return "text-gray-500";
    return "text-amber-400";
  }

  function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-AU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <section className="px-6 py-12 border-t border-white/10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-sky-400" />
          <div>
            <h2 className="text-lg font-bold">Post Scheduler</h2>
            <p className="text-xs text-gray-500">Queue posts to fire on Nostr · Telegram · Discord at a specific time</p>
          </div>
        </div>
        <Button size="sm" variant="outline"
          className="text-xs border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
          onClick={() => setOpen(o => !o)}
          data-testid="button-toggle-scheduler"
        >
          {open ? "Hide Composer" : "New Post"}
        </Button>
      </div>

      {/* Compose form */}
      {open && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-950/10 p-5 mb-6 space-y-4">
          <div className="grid grid-cols-[56px_1fr] gap-3">
            {/* Emoji picker */}
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Emoji</label>
              <div className="relative">
                <select
                  value={emoji}
                  onChange={e => setEmoji(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-md text-sm h-8 px-1 text-white appearance-none cursor-pointer"
                  data-testid="select-post-emoji"
                >
                  {EMOJI_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Title / subject line</label>
              <Input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. NexusOS — PHR-1 hardware update"
                className="bg-black/40 border-white/10 text-white text-xs h-8"
                data-testid="input-post-title"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Body (plain text, supports line breaks)</label>
            <Textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write your post here..."
              rows={5}
              className="bg-black/40 border-white/10 text-white text-xs resize-none"
              data-testid="textarea-post-body"
            />
            <p className="text-[10px] text-white/30 mt-1">{body.length} chars</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Hashtags (comma-separated)</label>
              <Input value={hashtagInput} onChange={e => setHashtagInput(e.target.value)}
                placeholder="NexusOS, Bitcoin, WNSP"
                className="bg-black/40 border-white/10 text-white text-xs h-8"
                data-testid="input-post-hashtags"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Schedule time (local)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={minDateTime}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-md text-xs h-8 px-2 text-white"
                data-testid="input-post-schedule-time"
              />
            </div>
          </div>

          {/* Platform toggles */}
          <div>
            <label className="text-[10px] text-white/40 mb-2 block">Platforms</label>
            <div className="flex gap-2">
              {["nostr", "telegram", "discord"].map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  data-testid={`toggle-platform-${p}`}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    platforms.includes(p)
                      ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                      : "bg-white/5 border-white/10 text-gray-500"
                  }`}
                >
                  {p === "nostr" ? "⚡ Nostr" : p === "telegram" ? "✈️ Telegram" : "🎮 Discord"}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold h-9"
            onClick={handleSchedule}
            disabled={createMut.isPending}
            data-testid="button-schedule-post"
          >
            <Calendar size={13} className="mr-2" />
            {createMut.isPending ? "Scheduling..." : "Schedule Post"}
          </Button>
        </div>
      )}

      {/* Pending queue */}
      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] text-amber-400 uppercase tracking-widest mb-3 font-bold">
            ⏳ Queued ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map(post => (
              <div key={post.id}
                className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 flex items-start gap-3"
                data-testid={`card-scheduled-post-${post.id}`}
              >
                <span className="text-lg leading-none">{post.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{post.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{post.body}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <Clock size={10} /> {fmtTime(post.scheduledAt)}
                    </span>
                    <span className="text-[10px] text-gray-600">{post.platforms.join(" · ")}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => fireNowMut.mutate(post.id)}
                    disabled={fireNowMut.isPending}
                    data-testid={`button-fire-now-${post.id}`}
                    className="text-[10px] px-2 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors flex items-center gap-1"
                    title="Fire now"
                  >
                    <Play size={10} /> Now
                  </button>
                  <button
                    onClick={() => cancelMut.mutate(post.id)}
                    disabled={cancelMut.isPending}
                    data-testid={`button-cancel-post-${post.id}`}
                    className="text-[10px] px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Cancel"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3 font-bold">
            History ({history.length})
          </p>
          <div className="space-y-1.5">
            {history.slice(0, 10).map(post => (
              <div key={post.id}
                className="rounded-lg border border-white/5 bg-white/2 p-2.5 flex items-center gap-3"
                data-testid={`card-post-history-${post.id}`}
              >
                <span className="text-base leading-none">{post.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/70 truncate">{post.title}</p>
                  <p className="text-[10px] text-gray-600">{fmtTime(post.scheduledAt)}</p>
                </div>
                <div className={`flex items-center gap-1 text-[10px] ${statusColor(post.status)}`}>
                  {statusIcon(post.status)}
                  {post.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && posts.length === 0 && !open && (
        <div className="text-center py-8 text-gray-600 text-sm">
          No posts scheduled yet. Click <span className="text-sky-400">New Post</span> to queue one.
        </div>
      )}
    </section>
  );
}

function SpectrumBar() {
  return (
    <div className="w-full h-3 rounded-full overflow-hidden" style={{
      background: "linear-gradient(to right, #7f00ff, #4400ff, #0000ff, #00aaff, #00ffaa, #aaff00, #ffff00, #ffaa00, #ff5500, #ff0000)"
    }} />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors shrink-0">
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function CrowdfundPage() {
  usePageMeta({
    title: "Crowdfund NexusOS — Hardware Founder & NXT Supporter Tiers",
    description: "Fund the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Hardware Founder slots (25 units), NXT Supporter packs, and Spectral Bundles. Physics-based computing starts here.",
    canonical: "https://wnsp.io/crowdfund",
    ogTitle: "Crowdfund NexusOS Hardware — PHR-1 & SNIC",
    ogDescription: "25 Hardware Founder slots. PHR-1 resonator, SNIC photonic NIC. Fund the world's first physics-based computing hardware. 100M sats / 100,000 NXT per slot.",
    twitterTitle: "Crowdfund NexusOS — Hardware Founder Slots Open",
    twitterDescription: "PHR-1 resonator. SNIC photonic NIC. 25 Hardware Founder slots. Fund physics-based computing.",
  });
  const { data: eco } = useQuery<any>({ queryKey: ["/api/ecosystem/status"], retry: false });
  const { data: chain } = useQuery<any>({ queryKey: ["/api/blockchain/chain"], retry: false });
  const { data: geyser } = useQuery<any>({ queryKey: ["/api/crowdfund/geyser-content"], retry: false });
  const { data: indiegogo } = useQuery<any>({ queryKey: ["/api/crowdfund/indiegogo-content"], retry: false });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [zapGoalSats, setZapGoalSats] = useState("10000000");
  const [zapResult, setZapResult] = useState<any>(null);
  const [showGeyser, setShowGeyser] = useState(false);
  const [showIndiegogo, setShowIndiegogo] = useState(false);
  const [showXShare, setShowXShare] = useState(false);
  const [tweetIdx, setTweetIdx] = useState(0);
  const { toast } = useToast();

  const zapMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/crowdfund/zap-goal", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ goalSats: parseInt(zapGoalSats), phase: "Phase 1 — PHR-1 Hardware Prototype" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j;
    },
    onSuccess: (d) => { setZapResult(d); toast({ title: "⚡ Zap Goal published!", description: `Live on ${d.relays?.length ?? 0} Nostr relays` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const promoMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/crowdfund/fire-promo", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ platform: "both", topic: "crowdfund" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j;
    },
    onSuccess: () => toast({ title: "📡 Promo fired!", description: "Posted to Nostr + Telegram" }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const p2pPromoMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/crowdfund/fire-promo", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ platform: "both", topic: "transmission" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j;
    },
    onSuccess: () => toast({ title: "📡 P2P tutorial broadcast!", description: "How-to posted to Nostr + Telegram + Discord" }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const ownerPromoMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/crowdfund/fire-promo", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ platform: "both", topic: "owner" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j;
    },
    onSuccess: () => toast({ title: "🏗️ Owner call broadcast!", description: "Posted to Nostr + Telegram + Discord" }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const OWNER_TWEET = "Blockchain developers wanted — owners, not employees.\n\nTry the physics encoder first:\nnpm install nexusos-ce-encoder\n\nLanguage spec: wavelengthscript.dev\nHardware spec: wnsp.io/hardware-spec\n\nProtocol revenue share, not a salary. Token allocation. Full architectural authority.\n\nDM @wnsptech\n#NexusOS #Blockchain #Bitcoin #Photonics";
  const OWNER_TWEET_URL = `https://x.com/intent/tweet?text=${encodeURIComponent(OWNER_TWEET)}`;

  const blocks = chain?.blocks ?? [];
  const spectralTotal = eco?.systems?.spectralDb?.total ?? 479;
  const txCount = eco?.systems?.spectralDb?.confirmed ?? 478;
  const agentCount = eco?.systems?.agents?.active ?? 6;
  const blockCount = eco?.systems?.blockchain?.height ?? 5;

  const faqs = [
    {
      q: "What are Nexus Shares?",
      a: "Nexus Shares are equity units in the NexusOS hardware development project, issued on-chain at your Ψ(wdm, oam, polarisation) address. Each share is permanently recorded on the NexusOS blockchain with your name, contribution wavelength, and timestamp. When NexusOS moves to a public listing, Nexus Shares become the basis for your allocation.",
    },
    {
      q: "What does 'a seat at the table' mean?",
      a: "Hardware Founders (100,000 NXT+) and Nexus Partners (1,000,000 NXT+) receive a literal vote on hardware development decisions — roadmap priorities, manufacturing partners, component specifications, and release timelines. This is not an advisory role in name only. Your share class gives you binding input on the direction of the technology.",
    },
    {
      q: "What is the money actually funding?",
      a: "100% of R&D funding goes to communication hardware development: PHR-1 resonator production (PROTO-001 already manufactured & tested by Coiltek SA — 2026-07-27, 3 units, 100% PASS), Syncbox Controller firmware, ZERO-G state testing, and the Spectral Relay Mesh network nodes. The Orbital Treasury distributes funds across 5 buckets: 35% maintenance, 25% deliverables, 20% research, 10% agent rewards, 10% Nexus Charitable Trust.",
    },
    {
      q: "What is NXT and how does it work?",
      a: "NXT is the native token of NexusOS with 8 decimal places and a 21 billion unit supply. Transaction costs are derived from E=hf — the energy of a photon at your operation wavelength. Every operation has a physical cost grounded in Maxwell equations. Your share purchase is recorded as an on-chain transaction at your personal wavelength.",
    },
    {
      q: "Why AGPL-3.0?",
      a: "The infrastructure of civilisation cannot be owned by one company. AGPL-3.0 means every business that builds on NexusOS must publish their source code. If you improve the commons, you give back to the commons. Nexus Shareholders own equity in the company that stewards the infrastructure — not the protocol itself, which remains free forever.",
    },
    {
      q: "When will NexusOS be publicly traded?",
      a: `Phase 3 roadmap — after hardware prototypes are shipping and the spectral network has 10+ physical nodes. Class A and A+ shareholders receive priority allocation at any public listing. As of today: ${spectralTotal} spectral records, ${txCount} confirmed transactions, ${blockCount} blockchain blocks, ${agentCount} kernel agents — all verifiable on-chain.`,
    },
    {
      q: "What is the PHR-1 hardware unit?",
      a: "PHR-1 is the first physical resonator implementing the ZERO-G state — gravitational de-correlation through phase alignment of a bifilar toroid coil. PROTO-001 (NEX-0589-PROTO-001) was manufactured by Coiltek Pty Ltd (SA, Australia) and 100% electrically tested on 2026-07-27: 3 units, L_avg = 62.2 μH, DCR_avg ≈ 295 mΩ, all PASS. Hardware Founders receive a unit in the first production batch of 25.",
    },
    {
      q: "Is this real working software today?",
      a: `Yes. The physics engine is live, the blockchain is live, agents are running. Block #4 — 'angry birds' 25MB — sits at Ψ(211,35,H) 534.51nm on-chain right now. The hardware is the next layer. This is not a whitepaper project.`,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-mono">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/80 backdrop-blur">
        <Link href="/wnsp">
          <span className="text-lg font-bold tracking-widest" style={{ color: wlToRgb(534.51) }}>NEXUS<span className="text-white">OS</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/evidence">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs">Evidence</Button>
          </Link>
          <Link href="/nexus-hardware-os">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs">Hardware</Button>
          </Link>
          <Link href="/wavelength-lang">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs">WLS</Button>
          </Link>
          <Link href="/auth">
            <Button size="sm" className="text-xs font-bold text-black" style={{ background: wlToRgb(534.51) }}>
              Enter OS
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── GEYSER LIVE BANNER ── */}
      <section className="pt-24 pb-0 px-4 max-w-3xl mx-auto">
        <a href="https://geyser.fund/project/nexusos" target="_blank" rel="noreferrer"
          data-testid="banner-geyser-live"
          className="flex items-center gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/6 p-5 mb-4 hover:border-amber-500/70 transition-all group">
          <span className="text-3xl">🌊</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Live on Geyser</span>
              <span className="text-[9px] text-white/20">Bitcoin Lightning · 5% platform fee · 0.2% Lightning routing</span>
            </div>
            <div className="text-sm font-bold text-white">NexusOS — The First OS Written in the Language of Light</div>
            <div className="text-[11px] text-white/40 mt-0.5">Fund the bridge from silicon to photonics. Sats accepted. No account needed to contribute.</div>
          </div>
          <div className="flex items-center gap-1 text-amber-400 text-xs font-bold shrink-0 group-hover:translate-x-1 transition-transform">
            Fund → <ExternalLink size={11} />
          </div>
        </a>
      </section>

      {/* ── PLATFORM HUB ── */}
      <section className="pt-4 pb-6 px-4 max-w-3xl mx-auto" id="platform-hub">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-3">
            <Rss size={10} /> Crowdfund Hub — All Platforms
          </div>
          <p className="text-2xl font-bold text-white">Promote. Disclose. Receive.</p>
          <p className="text-sm text-white/40 mt-1">All donation outlets connected. Full transparency on every channel.</p>
        </div>

        {/* Platform connectivity map */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: "⚡", name: "Nostr",      status: "live",    desc: "Zap Goals + auto-promo",        url: "https://primal.net/p/npub1pk8wh66aqhxkzl3n0p7q78hzz4f9r5j4snqj7skck2p7dkxmwj2s9pnnkd" },
            { icon: "🌊", name: "Geyser",     status: "live",    desc: "Bitcoin Lightning crowdfund",   url: "https://geyser.fund/project/nexusos" },
            { icon: "✈️", name: "Telegram",   status: "live",    desc: "Auto-broadcast channel",        url: "https://t.me/troglodytememe" },
            { icon: "𝕏",  name: "Twitter/X",  status: "live",    desc: "Share + community threads",     url: "https://x.com/wnsptech" },
            { icon: "🚀", name: "Indiegogo",  status: "setup",   desc: "Fiat donations bridge",         url: "https://www.indiegogo.com/admin/creator/wnsptech/projects/create" },
            { icon: "🎮", name: "Discord",    status: "live",    desc: "#the-czc-sink-lab",             url: "https://discord.gg/nexusos" },
            { icon: "💻", name: "GitHub",     status: "live",    desc: "AGPL-3.0 open source",          url: "https://github.com/nexusosdaily-code/NexusOS" },
            { icon: "🟠", name: "UniSat",     status: "live",    desc: "NXWV Rune marketplace",         url: "https://unisat.io/market/runes?tick=NEXUS%E2%80%A2WAVELENGTH" },
          ].map(p => (
            <a key={p.name} href={p.url} target="_blank" rel="noreferrer"
              className="rounded-xl border border-white/8 bg-black/30 hover:border-white/20 p-3 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{p.icon}</span>
                  <span className="text-xs font-bold text-white">{p.name}</span>
                </div>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                  p.status === "live"    ? "bg-green-500/15 text-green-400" :
                  p.status === "setup"   ? "bg-amber-500/15 text-amber-400" :
                                          "bg-slate-500/15 text-slate-400"
                }`}>{p.status}</span>
              </div>
              <div className="text-[10px] text-white/35">{p.desc}</div>
            </a>
          ))}
        </div>

        {/* ─ Nostr Zap Goal Publisher ─ */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-purple-400" />
              <span className="text-xs font-bold text-purple-300">Nostr Zap Goal (NIP-75)</span>
            </div>
            <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-2 py-0.5">Primal · Amethyst · Snort</span>
          </div>
          <p className="text-[11px] text-white/40 mb-3">Publishes a live fundraising goal to Nostr. People zap sats directly to your Lightning address. Progress visible in Primal, Amethyst, Snort.</p>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="text-[10px] text-white/40 mb-1 block">Goal amount (sats)</label>
              <Input value={zapGoalSats} onChange={e => setZapGoalSats(e.target.value)}
                className="bg-black/40 border-white/10 text-white text-xs h-8" placeholder="10000000" />
            </div>
            <div className="flex items-end">
              <span className="text-[10px] text-white/25 pb-2">{parseInt(zapGoalSats || "0").toLocaleString()} sats</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => zapMut.mutate()} disabled={zapMut.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs h-8"
              data-testid="button-publish-zap-goal">
              <Zap size={12} className="mr-1" /> {zapMut.isPending ? "Publishing…" : "Publish Zap Goal to Nostr"}
            </Button>
            <Button size="sm" onClick={() => promoMut.mutate()} disabled={promoMut.isPending}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs h-8"
              data-testid="button-fire-promo">
              <Send size={12} className="mr-1" /> {promoMut.isPending ? "Firing…" : "Fire Crowdfund Promo"}
            </Button>
            <Button size="sm" onClick={() => p2pPromoMut.mutate()} disabled={p2pPromoMut.isPending}
              className="bg-cyan-800 hover:bg-cyan-700 text-white text-xs h-8"
              data-testid="button-fire-p2p-promo">
              <Radio size={12} className="mr-1" /> {p2pPromoMut.isPending ? "Broadcasting…" : "Broadcast P2P Tutorial"}
            </Button>
            <Button size="sm" onClick={() => ownerPromoMut.mutate()} disabled={ownerPromoMut.isPending}
              className="bg-amber-800 hover:bg-amber-700 text-white text-xs h-8"
              data-testid="button-fire-owner-promo">
              <Users size={12} className="mr-1" /> {ownerPromoMut.isPending ? "Broadcasting…" : "Broadcast Owner Call"}
            </Button>
          </div>
          {zapResult && (
            <div className="mt-3 p-3 rounded-lg bg-green-950/20 border border-green-500/20 space-y-2">
              <div className="text-[10px] text-green-400 font-semibold">⚡ Live on {zapResult.relays?.length} relays</div>
              <div className="text-[9px] text-white/25 mb-1">View event — try any link if one is down:</div>
              {[
                { label: "Snort Social", url: zapResult.snortLink, color: "text-purple-400" },
                { label: "njump.me",     url: zapResult.njumpLink, color: "text-indigo-400" },
              ].map(v => v.url && (
                <div key={v.label} className="flex items-center gap-2">
                  <span className="text-[9px] text-white/25 w-20 shrink-0">{v.label}:</span>
                  <a href={v.url} target="_blank" rel="noreferrer"
                    className={`text-[10px] ${v.color} hover:underline truncate flex-1`}>{v.label} ↗</a>
                  <CopyButton text={v.url} />
                </div>
              ))}
              {zapResult.primalLink && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/25 w-20 shrink-0">Profile:</span>
                  <a href={zapResult.primalLink} target="_blank" rel="noreferrer"
                    className="text-[10px] text-blue-400 hover:underline truncate flex-1">Primal profile ↗</a>
                  <CopyButton text={zapResult.primalLink} />
                </div>
              )}
              <p className="text-[9px] text-white/20 leading-relaxed pt-1">
                Kind 9041 Zap Goals appear on your Primal profile page, not at a direct event URL. Snort Social and njump.me both render them inline.
              </p>
            </div>
          )}
        </div>

        {/* ─ Blockchain Owner Program ─ */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-300">Blockchain Developer-Owners Wanted</span>
            <a href="/hardware-spec" target="_blank"
              className="ml-auto text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 hover:bg-amber-500/20 transition-colors">
              Hardware Spec ↗
            </a>
          </div>

          <p className="text-[11px] text-white/50 mb-3 leading-relaxed">
            My focus is hardware manufacturing — the PHR-1 resonator. I'm looking for blockchain developers who want to <strong className="text-amber-300">own the protocol</strong>, not earn from it as a contractor. The blockchain funds the hardware. The hardware validates the chain.
          </p>

          <div className="mb-4 p-3 rounded-lg bg-black/50 border border-amber-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-amber-400/70 font-semibold uppercase tracking-wide">Try the encoder — then reach out</span>
              <div className="flex gap-2">
                <a href="https://wavelengthscript.dev" target="_blank" rel="noreferrer"
                  className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-2 py-0.5 hover:bg-amber-500/20 transition-colors">
                  wavelengthscript.dev ↗
                </a>
                <a href="https://www.npmjs.com/package/nexusos-ce-encoder" target="_blank" rel="noreferrer"
                  className="text-[9px] bg-red-500/10 text-red-300 border border-red-500/20 rounded-full px-2 py-0.5 hover:bg-red-500/20 transition-colors">
                  npmjs ↗
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-black/60 rounded px-3 py-2 font-mono">
              <span className="text-green-400 text-[11px] select-all flex-1">npm install nexusos-ce-encoder</span>
              <CopyButton text="npm install nexusos-ce-encoder" />
            </div>
            <p className="text-[9px] text-white/25 mt-2 leading-relaxed">
              Tweeting this command helps Google crawl the npm page and signals the tech is real before you commit to building.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-2">
            {[
              { icon: "⛓️", heading: "What you'd own",        items: ["WNSP physics-based consensus layer", "NXT token economics (21B supply, physics fees)", "Wallet + governance infrastructure (11 live params)", "P2P mesh networking layer"] },
              { icon: "💎", heading: "What ownership means",  items: ["Protocol revenue share — not a salary", "Token allocation from orbital treasury", "Full architectural authority over the chain", "Your name on a spec running on photonic hardware ~2032"] },
            ].map(col => (
              <div key={col.heading} className="p-3 rounded-lg bg-black/30 border border-white/5">
                <div className="text-[10px] font-bold text-amber-300/80 mb-2">{col.icon} {col.heading}</div>
                <ul className="space-y-1">
                  {col.items.map(item => (
                    <li key={item} className="text-[10px] text-white/40 flex gap-2">
                      <span className="text-amber-500/60 mt-0.5 shrink-0">→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-black/30 border border-amber-500/10 mb-4">
            <div className="text-[10px] font-bold text-amber-300/70 mb-2">🔄 The funding loop</div>
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              {["Blockchain liquidity", "→", "Platform revenue", "→", "Hardware manufacturing", "→", "Photonic validation", "→", "Network value"].map((s, i) => (
                <span key={i} className={s === "→" ? "text-amber-500/40" : "text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10"}>{s}</span>
              ))}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <a href={OWNER_TWEET_URL} target="_blank" rel="noreferrer"
              data-testid="link-owner-post-x"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs transition-colors">
              <Twitter size={12} /> Post on X
            </a>
            <Button size="sm" onClick={() => ownerPromoMut.mutate()} disabled={ownerPromoMut.isPending}
              className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-xs h-8"
              data-testid="button-broadcast-owner-call">
              <Send size={12} className="mr-1" />
              {ownerPromoMut.isPending ? "Broadcasting…" : "Broadcast → Nostr + Telegram + Discord"}
            </Button>
          </div>
        </div>

        {/* ─ P2P Transmission Tutorial ─ */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio size={14} className="text-cyan-400" />
            <span className="text-xs font-bold text-cyan-300">P2P Spectral Transmission — How It Works</span>
            <span
              className="ml-auto text-[9px] bg-cyan-500/10 text-cyan-400/50 border border-cyan-500/20 rounded-full px-2 py-0.5">
              Sign in to access console
            </span>
          </div>
          <p className="text-[11px] text-white/40 mb-4">
            A working P2P data layer — no cloud, no DNS, no middlemen. Data is CE-encoded to a unique wavelength λ and Ψ channel, stored on-chain, retrievable by anyone with the address.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { step: "1", color: "#22d3ee", title: "Go to wnsp.io/transmission",         desc: "The broadcasting console. Works without an account for reading." },
              { step: "2", color: "#34d399", title: "Compose your payload",               desc: "Type text or upload a file (video, image, binary). NexusOS CE-encodes it to a unique λ and Ψ(wdm,oam,pol) channel derived from the content itself." },
              { step: "3", color: "#fbbf24", title: "Inspect the spectral analysis",      desc: "See the wavelength distribution across your data, total energy in Joules (E=hf per character), and the estimated NXT transmission fee." },
              { step: "4", color: "#f87171", title: "Transmit",                           desc: "Click Transmit. Watch your data propagate as photons. On completion: a Spectral Receipt — permanent on-chain ordinal with your λ, Ψ, and content hash." },
              { step: "5", color: "#a78bfa", title: "Retrieve at spectral-workspace",     desc: "Go to wnsp.io/spectral-workspace, tune to your wavelength, retrieve it. Anyone with the λ address can find your transmission — no account required." },
            ].map(s => (
              <div key={s.step} className="flex gap-3 p-2.5 rounded-lg bg-black/30 border border-white/5">
                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                  style={{ background: s.color + "20", color: s.color, border: `1px solid ${s.color}40` }}>{s.step}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-white/80 mb-0.5 font-mono">{s.title}</div>
                  <div className="text-[10px] text-white/40 leading-relaxed">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/20 border border-cyan-500/10 mb-4">
            <Waves size={12} className="text-cyan-500 flex-shrink-0" />
            <p className="text-[10px] text-white/35 leading-relaxed">
              <strong className="text-cyan-400/80">51,200 orthogonal channels.</strong> This architecture runs on silicon today — migrates to photonic hardware ~2032. Zero rewrite needed because NexusOS is already written in the language of the destination hardware.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => p2pPromoMut.mutate()} disabled={p2pPromoMut.isPending}
              className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-8"
              data-testid="button-broadcast-p2p-tutorial">
              <Send size={12} className="mr-1" />
              {p2pPromoMut.isPending ? "Broadcasting…" : "Broadcast Tutorial → Nostr + Telegram + Discord"}
            </Button>
            <Link href="/auth">
              <span className="flex items-center gap-1.5 px-3 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/40 text-xs transition-colors cursor-pointer">
                <ExternalLink size={11} /> Sign In to Try
              </span>
            </Link>
          </div>
        </div>

        {/* ─ Geyser Campaign Content ─ */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌊</span>
              <span className="text-xs font-bold text-amber-300">Geyser.fund Campaign</span>
            </div>
            <button onClick={() => setShowGeyser(g => !g)}
              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1">
              {showGeyser ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showGeyser ? "Hide" : "Show content"}
            </button>
          </div>
          <p className="text-[11px] text-white/40 mb-3">Bitcoin Lightning crowdfund — 5% platform fee + 0.2% Lightning routing. No fiat processing fees when paying with sats.</p>
          <a href="https://geyser.fund/project/nexusos" target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs mb-3"
            data-testid="link-geyser-campaign">
            <ExternalLink size={12} /> Back NexusOS on Geyser →
          </a>
          {showGeyser && geyser && (
            <div className="space-y-3">
              {[
                { label: "Title",       val: geyser.title },
                { label: "Tagline",     val: geyser.tagline },
                { label: "Description", val: geyser.description },
                { label: "Tags",        val: geyser.tags?.join(", ") },
                { label: "Website",     val: geyser.website },
              ].map(f => (
                <div key={f.label} className="bg-black/40 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/40 font-semibold uppercase">{f.label}</span>
                    <CopyButton text={f.val ?? ""} />
                  </div>
                  <pre className="text-[10px] text-white/70 whitespace-pre-wrap font-mono leading-relaxed">{f.val}</pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─ Twitter / X Share Panel ─ */}
        {(() => {
          const TWEETS = [
            { label: "Hardware CTA",       text: "Fund the PHR-1 resonator — the first physical implementation of ZERO-G state.\n\n🔬 Physics-based OS · Λ=hf/c²\n🌈 NXWV Rune 952596:379 sealed on Bitcoin\n📄 Full disclosure: wnsp.io/wnsp-paper\n\nDonate: wnsp.io/crowdfund\n\n@wnsptech #NexusOS #Bitcoin #Lightning #Photonics" },
            { label: "Science angle",      text: "NexusOS replaces cryptographic hashing with Maxwell equation validation.\n\n51,200 orthogonal Ψ channels · 21B NXWV Rune · AGPL-3.0\n\nBuilding the OS of a Kardashev Type I civilisation.\n\nwnsp.io/crowdfund\n\n@wnsptech #Physics #Bitcoin #OpenSource #Photonics" },
            { label: "Founder tier",       text: "25 Hardware Founder slots open.\n\n100,000 sats → PHR-1 resonator unit + 100,000 Nexus Shares (Class A).\n\nFirst production batch. Hardware advisory seat.\n\nwnsp.io/crowdfund\n\n@wnsptech #NexusOS #Bitcoin #Hardware #Lightning" },
            { label: "Viral hook",         text: "What if communication ran on physics, not software policy?\n\n51,200 orthogonal light channels. No DNS. No IP. Just wavelengths.\n\n@wnsptech — NexusOS. wnsp.io\n\n#Photonics #Bitcoin #NexusOS" },
            { label: "P2P transmission",   text: "Send data across a P2P network using wavelength addresses — no cloud, no DNS.\n\nEncode → Ψ channel → Spectral Receipt → Permanent on-chain ordinal.\n\nTry it: wnsp.io/transmission\n\n@wnsptech #NexusOS #P2P #WNSP #Photonics #Bitcoin" },
            { label: "Blockchain owner",   text: OWNER_TWEET },
          ];
          const tweet = TWEETS[tweetIdx] ?? TWEETS[0];
          const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweet.text)}`;
          return (
            <div className="rounded-xl border border-sky-500/20 bg-sky-950/10 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Twitter size={14} className="text-sky-400" />
                  <span className="text-xs font-bold text-sky-300">Twitter / X Share</span>
                  <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full px-2 py-0.5">web intent — no login needed</span>
                </div>
                <button onClick={() => setShowXShare(x => !x)}
                  className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1">
                  {showXShare ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showXShare ? "Hide" : "Show tweets"}
                </button>
              </div>
              <p className="text-[11px] text-white/40 mb-3">
                Five pre-written tweet angles — each tags <strong className="text-sky-400">@wnsptech</strong> automatically. Click <strong className="text-white/60">Share on X</strong> to open the compose window pre-loaded. No API key required.
              </p>
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {TWEETS.map((t, i) => (
                  <button key={i} onClick={() => setTweetIdx(i)}
                    data-testid={`btn-tweet-angle-${i}`}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                      i === tweetIdx
                        ? "bg-sky-500/20 border-sky-500/40 text-sky-300 font-semibold"
                        : "border-white/10 text-white/30 hover:text-white/60 hover:border-white/20"
                    }`}>{t.label}</button>
                ))}
              </div>
              {showXShare && (
                <div className="bg-black/40 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-white/40 font-semibold uppercase">Tweet copy</span>
                    <CopyButton text={tweet.text} />
                  </div>
                  <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono leading-relaxed">{tweet.text}</pre>
                  <div className="text-[10px] text-white/20 text-right mt-1">{tweet.text.length} / 280 chars</div>
                </div>
              )}
              <div className="flex gap-2">
                <a href={intentUrl} target="_blank" rel="noreferrer"
                  data-testid="link-share-on-x"
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs transition-colors">
                  <Twitter size={12} /> Share on X
                </a>
                <a href="https://x.com/wnsptech" target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-sky-500/30 text-sky-400 hover:bg-sky-950/40 text-xs transition-colors">
                  <ExternalLink size={11} /> @wnsptech
                </a>
              </div>
            </div>
          );
        })()}

        {/* ─ How to Trade NXWV Rune ─ */}
        <div className="rounded-xl border border-orange-500/20 bg-orange-950/10 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Bitcoin size={14} className="text-orange-400" />
            <span className="text-xs font-bold text-orange-300">How to Sell / Swap NEXUS•WAVELENGTH (NXWV)</span>
            <span className="ml-auto text-[9px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded px-2 py-0.5">Rune 952596:379</span>
          </div>
          <p className="text-[11px] text-white/40 mb-4">NXWV is a Bitcoin Rune — it lives on-chain and trades on Rune marketplaces. UniSat wallet is all you need.</p>

          {/* Steps */}
          <div className="space-y-2 mb-4">
            {[
              {
                step: "1",
                title: "Get UniSat Wallet",
                desc: "Install UniSat browser extension or mobile app. It natively supports Bitcoin Runes — no extra setup.",
                url: "https://unisat.io/download",
                cta: "Download UniSat",
                color: "#f97316",
              },
              {
                step: "2",
                title: "Receive or Import your NXWV",
                desc: "Send your NXWV to your UniSat Bitcoin address. UniSat will automatically detect the Rune balance.",
                url: null,
                cta: null,
                color: "#fbbf24",
              },
              {
                step: "3",
                title: "List on UniSat Marketplace",
                desc: "Go to UniSat Runes market → search NEXUS•WAVELENGTH → set your price in sats. Buyers pay directly via Bitcoin.",
                url: "https://unisat.io/market/runes?tick=NEXUS%E2%80%A2WAVELENGTH",
                cta: "Open NXWV Market",
                color: "#34d399",
              },
            ].map(s => (
              <div key={s.step} className="flex gap-3 p-3 rounded-lg bg-black/30 border border-white/5">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: s.color + "20", color: s.color, border: `1px solid ${s.color}40` }}>{s.step}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white/80 mb-0.5">{s.title}</div>
                  <div className="text-[10px] text-white/40 leading-relaxed">{s.desc}</div>
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer"
                    className="flex-shrink-0 self-center flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                    style={{ background: s.color + "15", color: s.color, border: `1px solid ${s.color}30` }}>
                    <ExternalLink size={10} /> {s.cta}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Marketplace grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "UniSat Market",  icon: "🟠", desc: "Primary — search NEXUS•WAVELENGTH", url: "https://unisat.io/market/runes?tick=NEXUS%E2%80%A2WAVELENGTH", status: "Recommended" },
              { name: "Magic Eden",     icon: "🪄", desc: "Runes → search NEXUS•WAVELENGTH",   url: "https://magiceden.io/runes/NEXUS%E2%80%A2WAVELENGTH",         status: "Alternative" },
            ].map(m => (
              <a key={m.name} href={m.url} target="_blank" rel="noreferrer"
                className="flex flex-col gap-1 p-3 rounded-lg bg-black/30 border border-white/5 hover:border-orange-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{m.icon}</span>
                    <span className="text-[11px] font-bold text-white/80">{m.name}</span>
                  </div>
                  <span className="text-[9px] text-orange-400/70">{m.status}</span>
                </div>
                <div className="text-[10px] text-white/35">{m.desc}</div>
              </a>
            ))}
          </div>
        </div>

        {/* ─ Full Disclosure Links ─ */}
        <div className="rounded-xl border border-green-500/15 bg-green-950/5 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-green-400" />
            <span className="text-xs font-bold text-green-300">Full Disclosure — All transparency documents</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Technical Whitepaper",      url: "/paper",           icon: "📄" },
              { label: "Hardware Specification",    url: "/hardware-spec",   icon: "🔧" },
              { label: "Tokenomics Breakdown",      url: "/campaign",        icon: "📊" },
              { label: "Audit Report",              url: "/coinsniper",      icon: "✅" },
              { label: "Live Physics Demo",         url: "/ce-se-pipeline",  icon: "⚡" },
              { label: "GitHub (AGPL-3.0)",         url: "https://github.com/nexusosdaily-code/NexusOS", icon: "💻", ext: true },
            ].map(d => (
              <a key={d.label} href={d.url} target={d.ext ? "_blank" : "_self"} rel="noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-lg bg-black/30 border border-white/5 hover:border-green-500/30 transition-all group">
                <span className="text-sm">{d.icon}</span>
                <span className="text-[11px] text-white/60 group-hover:text-white transition-colors">{d.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ─ Indiegogo Campaign Copy Builder ─ */}
        <div className="rounded-xl border border-pink-500/20 bg-pink-950/10 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🚀</span>
              <span className="text-xs font-bold text-pink-300">Indiegogo Campaign Copy</span>
              <span className="text-[9px] bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full px-2 py-0.5">All sections ready to paste</span>
            </div>
            <button onClick={() => setShowIndiegogo(i => !i)}
              className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-1">
              {showIndiegogo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showIndiegogo ? "Hide" : "Show all sections"}
            </button>
          </div>
          <p className="text-[11px] text-white/40 mb-3">
            Complete campaign copy — every field Indiegogo needs. Copy each section directly into your campaign editor.
          </p>
          {showIndiegogo && indiegogo && (
            <div className="space-y-3">

              {/* Campaign title */}
              <div className="bg-black/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">Campaign Title</span>
                  <CopyButton text={indiegogo.title ?? ""} />
                </div>
                <p className="text-xs text-white/80 font-semibold">{indiegogo.title}</p>
              </div>

              {/* Tagline */}
              <div className="bg-black/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">Tagline (short description)</span>
                  <CopyButton text={indiegogo.tagline ?? ""} />
                </div>
                <p className="text-[11px] text-white/70">{indiegogo.tagline}</p>
              </div>

              {/* Short summary */}
              <div className="bg-black/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">Short Summary (Indiegogo "about" field)</span>
                  <CopyButton text={indiegogo.shortSummary ?? ""} />
                </div>
                <p className="text-[11px] text-white/70">{indiegogo.shortSummary}</p>
              </div>

              {/* Campaign settings */}
              {indiegogo.sections && (
                <div className="bg-black/40 rounded-lg p-3">
                  <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest block mb-2">Campaign Settings</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-white/40">Category:</span> <span className="text-white/70">{indiegogo.sections.category}</span></div>
                    <div><span className="text-white/40">Type:</span> <span className="text-white/70">{indiegogo.sections.campaignType}</span></div>
                    <div><span className="text-white/40">Duration:</span> <span className="text-white/70">{indiegogo.sections.duration}</span></div>
                    <div><span className="text-white/40">Tags:</span> <span className="text-white/70">{indiegogo.sections.tags?.join(", ")}</span></div>
                  </div>
                  <div className="mt-2 p-2 bg-white/5 rounded text-[10px] text-amber-300">
                    📸 {indiegogo.sections.heroImage}
                  </div>
                  <div className="mt-1 p-2 bg-white/5 rounded text-[10px] text-sky-300">
                    🎬 {indiegogo.sections.videoIdea}
                  </div>
                </div>
              )}

              {/* Full story */}
              <div className="bg-black/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">Full Campaign Story (paste into editor)</span>
                  <CopyButton text={indiegogo.story ?? ""} />
                </div>
                <pre className="text-[10px] text-white/70 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">{indiegogo.story}</pre>
              </div>

              {/* Backer update */}
              {indiegogo.backerUpdate && (
                <div className="bg-black/40 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">Backer Update (post once live)</span>
                    <CopyButton text={`SUBJECT: ${indiegogo.backerUpdate.subject}\n\n${indiegogo.backerUpdate.body}`} />
                  </div>
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-white/30 uppercase">Subject</span>
                      <CopyButton text={indiegogo.backerUpdate.subject ?? ""} />
                    </div>
                    <p className="text-[10px] text-white/60 italic">{indiegogo.backerUpdate.subject}</p>
                  </div>
                  <pre className="text-[10px] text-white/60 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">{indiegogo.backerUpdate.body}</pre>
                </div>
              )}

              {/* Quick links */}
              <div className="grid grid-cols-2 gap-2">
                <a href="https://www.indiegogo.com/admin/creator/wnsptech/projects/create" target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-colors">
                  <ExternalLink size={12} /> Open Campaign Editor (wnsptech)
                </a>
                <a href="https://wnsp.io/crowdfund" target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 font-bold text-xs transition-colors">
                  <ExternalLink size={12} /> wnsp.io/crowdfund (reference)
                </a>
              </div>

              <p className="text-[9px] text-white/20 text-center">
                Not an investment offer. Nexus Shares are open-source contribution records. AGPL-3.0.
              </p>
            </div>
          )}
          {showIndiegogo && !indiegogo && (
            <div className="text-[11px] text-white/40 text-center py-4">Loading campaign copy…</div>
          )}
        </div>
      </section>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-20 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => {
            const nm = 380 + (i / 17) * 400;
            return (
              <div key={i} className="absolute top-0 bottom-0 opacity-5" style={{
                left: `${(i / 17) * 100}%`, width: "1px",
                background: wlToRgb(nm), boxShadow: `0 0 12px ${wlToRgb(nm)}`
              }} />
            );
          })}
        </div>

        <Badge className="mb-4 text-xs px-4 py-1 border" style={{ borderColor: "#f87171", color: "#f87171", background: "#f8717110" }}>
          HARDWARE R&D · OPEN SOURCE AGPL-3.0 · NEXUS SHARES ISSUED ON-CHAIN
        </Badge>

        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
          A Seat at the<br />
          <span style={{ color: wlToRgb(534.51) }}>Table</span>
        </h1>

        <p className="text-xl text-gray-300 max-w-2xl mb-4 leading-relaxed">
          Every contribution to NexusOS hardware development earns you <strong>Nexus Shares</strong> — 
          permanent, on-chain equity in the new physics of communication.
        </p>
        <div className="text-2xl font-bold mb-4 py-3 px-6 rounded-xl border" style={{ borderColor: "#fbbf24", color: "#fbbf24", background: "#fbbf2410" }}>
          Donation = Nexus Shares · Shares = Seat at the Table
        </div>
        <p className="text-gray-400 max-w-xl mb-10 text-sm leading-relaxed">
          You are not donating to a product. You are funding the research and development of 
          communication hardware built on Λ=hf/c², and becoming a shareholder in the 
          infrastructure of the next century.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <a href="#tiers">
            <Button size="lg" className="px-8 font-bold text-black" style={{ background: wlToRgb(534.51) }}>
              Get Your Shares <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
          <Link href="/evidence">
            <Button size="lg" variant="outline" className="px-8 border-white/20 text-white hover:bg-white/10">
              See Live Proof <Shield className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <SpectrumBar />
        <p className="text-xs text-gray-600 mt-2">380nm → 780nm · Your shares are recorded at your personal wavelength</p>
      </section>

      {/* ── EQUITY STATEMENT ── */}
      <section className="px-6 py-16 border-y border-white/10" style={{ background: "linear-gradient(135deg, #f8717108, #ec489908)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { icon: Briefcase, color: "#f87171", title: "Hardware R&D", desc: "Every NXT goes directly into communication hardware development. PHR-1 prototype, bifilar coil manufacturing, spectral relay network nodes." },
              { icon: Award, color: "#fbbf24", title: "On-Chain Shares", desc: "Your Nexus Shares are issued as a blockchain transaction at your personal Ψ(wdm, oam, pol) channel. Permanent, verifiable, uncensorable." },
              { icon: Scale, color: "#60a5fa", title: "Governance Rights", desc: "Class A and A+ shareholders vote on hardware roadmap, manufacturing decisions, and company direction. A real seat, not an honorary title." },
            ].map(item => (
              <div key={item.title} className="flex flex-col items-center gap-3 p-6 rounded-xl border border-white/10 bg-white/5">
                <item.icon className="h-10 w-10" style={{ color: item.color }} />
                <h3 className="font-bold text-lg" style={{ color: item.color }}>{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      <section className="px-6 py-16 border-b border-white/10 bg-white/2">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-8">What you're buying into — live on-chain today</p>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatPill label="Blockchain Blocks" value={String(blockCount)} color="#3b82f6" />
          <StatPill label="Spectral Records" value={String(spectralTotal)} color={wlToRgb(534.51)} />
          <StatPill label="Confirmed Txs" value={String(txCount)} color="#34d399" />
          <StatPill label="Kernel Agents" value={String(agentCount)} color="#a78bfa" />
        </div>
        <p className="text-center text-xs text-gray-600 mt-6">
          Block #4 "angry birds" 25MB · Ψ(211, 35, H) · 534.51 nm · The physics is already proven
        </p>
      </section>

      {/* ── THE HARDWARE ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">What your shares fund</p>
        <h2 className="text-3xl font-bold text-center mb-4">Communication hardware built on a new physics</h2>
        <p className="text-center text-sm text-gray-500 mb-12 max-w-2xl mx-auto">
          NexusOS replaces the software-only layer with physical hardware that speaks the language of light.
          Your shares fund the research, manufacturing, and deployment of this hardware.
        </p>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { icon: Radio, color: "#f87171", title: "PHR-1 Resonator (Phase 1)", desc: "144-turn bifilar coil achieving the ZERO-G state — gravitational de-correlation through phase alignment. First hardware layer of the Lambda Gate Substrate. 25 units in the first production batch." },
            { icon: Waves, color: "#fbbf24", title: "Syncbox Controller", desc: "PHR-1 hardware interface implementing the ZERO-G state achievement sequence. Phase control, frequency pulsing, impedance matching, CZC filtering, and ALP sensing. Demonstrated gravity de-correlation." },
            { icon: Globe, color: "#a78bfa", title: "Spectral Relay Mesh (Phase 2)", desc: "10 physical network nodes emitting at their CE→SE wavelength. No DNS. No IP. Node name = physics address. Peer-to-peer communication over visible light spectrum." },
            { icon: TrendingUp, color: "#60a5fa", title: "K1 Energy Market (Phase 3)", desc: "Live trading of orbital solar, fusion photonic, and planetary resonance energy. The economic layer of a Kardashev Type I civilisation. Shareholders participate in the K1 Energy Market." },
          ].map(item => (
            <div key={item.title} className="flex gap-4 p-5 rounded-xl border border-white/10 bg-white/5">
              <item.icon className="h-8 w-8 flex-shrink-0 mt-1" style={{ color: item.color }} />
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: item.color }}>{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HARDWARE BILL OF MATERIALS ── */}
      <section className="px-6 py-20 border-y border-white/10">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Complete hardware development kit</p>
          <h2 className="text-3xl font-bold text-center mb-4">Everything we need to build it</h2>
          <p className="text-center text-sm text-gray-500 mb-12 max-w-2xl mx-auto">
            This is the full bill of materials for NexusOS hardware development — every prototype component,
            lab instrument, and manufacturing tool your shares fund. Nothing hidden.
          </p>

          {/* L0 — Resonator */}
          <div className="mb-8 rounded-xl border p-6" style={{ borderColor: "#7c3aed40", background: "#7c3aed08" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#7c3aed", color: "white" }}>L0</div>
              <h3 className="font-bold text-lg" style={{ color: "#a78bfa" }}>Resonator Layer — Physical Field Generation</h3>
              <Badge className="text-xs" style={{ background: "#7c3aed20", color: "#a78bfa", border: "1px solid #7c3aed40" }}>PROTOTYPE</Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "PHR-1 Bifilar-Toroid Resonator", spec: "144 turns · Golden Angle 137.5° · Impedance 377Ω · ALP < 0.0001", purpose: "Core field generator — the physical power source for the Λ substrate" },
                { name: "CZC Catch Basin Unit", spec: "44 self-correction iterations · 99.56% coherence output", purpose: "Filters field noise — phase, amplitude, frequency, impedance correction" },
                { name: "ZERO-G State Sequencer", spec: "4-stage: Golden → 377Ω → 90° quadrature → ALP nulling", purpose: "Achieves gravity de-correlation — massless carrier envelope" },
                { name: "Precision Winding Jig (CNC)", spec: "Sub-millimetre bifilar spacing · 144-turn repeatability", purpose: "Manufacturing tool for coil winding at golden angle spec" },
                { name: "High-Current Precision PSU", spec: "0–30V / 0–10A · <0.1% ripple · 4-quadrant capable", purpose: "Powers the resonator at precise current levels for impedance matching" },
                { name: "Phase-Coherent Signal Generator", spec: "DC–2 GHz · <1 ps jitter · dual-output for bifilar drive", purpose: "Drives both windings of the bifilar coil in phase-quadrature" },
              ].map(item => (
                <div key={item.name} className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="font-bold text-sm mb-1" style={{ color: "#a78bfa" }}>{item.name}</div>
                  <div className="text-xs text-gray-500 mb-2 font-mono">{item.spec}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{item.purpose}</div>
                </div>
              ))}
            </div>
          </div>

          {/* L1 — Photonic Logic */}
          <div className="mb-8 rounded-xl border p-6" style={{ borderColor: "#0891b240", background: "#0891b208" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#0891b2", color: "white" }}>L1</div>
              <h3 className="font-bold text-lg" style={{ color: "#22d3ee" }}>Photonic Logic Layer — Lambda Gate Substrate</h3>
              <Badge className="text-xs" style={{ background: "#0891b220", color: "#22d3ee", border: "1px solid #0891b240" }}>DESIGNED</Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Lambda Gate v4 ASIC (InP)", spec: "8 operators: AND/OR/NOT/NAND/NOR/XOR/PHASE/ROUTE · Indium Phosphide", purpose: "Replaces MOSFET logic — phase-controlled photon paths, no electron switching" },
                { name: "OAM Modulator Array", spec: "50 orbital-angular-momentum modes · Spatial Light Modulator core", purpose: "Encodes logical states in photon angular momentum — orthogonal to polarisation" },
                { name: "WDM Multiplexer (256 ch)", spec: "380–780 nm · 1.56 nm channel spacing · DWDM-class isolation", purpose: "Routes 256 independent wavelength channels on a single waveguide simultaneously" },
                { name: "Silicon Photonic Waveguide Chip", spec: "Si/SiN current · InP next · pure photonic final · fab: IMEC/GlobalFoundries", purpose: "Carries photons between gates — no electron flow, no tunneling noise" },
                { name: "Tunable Laser Source (555 THz)", spec: "534–560 nm range · <1 MHz linewidth · single-mode fibre output", purpose: "Reference oscillator at first oscillation frequency (555 THz / 534.51 nm)" },
                { name: "Optical Spectrum Analyser", spec: "380–780 nm · 0.02 nm resolution · real-time WDM channel monitoring", purpose: "Verifies channel allocation and inter-channel isolation across the spectrum" },
              ].map(item => (
                <div key={item.name} className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="font-bold text-sm mb-1" style={{ color: "#22d3ee" }}>{item.name}</div>
                  <div className="text-xs text-gray-500 mb-2 font-mono">{item.spec}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{item.purpose}</div>
                </div>
              ))}
            </div>
          </div>

          {/* L2 — Channel / Network */}
          <div className="mb-8 rounded-xl border p-6" style={{ borderColor: "#05966940", background: "#05966908" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#059669", color: "white" }}>L2</div>
              <h3 className="font-bold text-lg" style={{ color: "#34d399" }}>Channel & Network Layer — Spectral Relay Mesh</h3>
              <Badge className="text-xs" style={{ background: "#05966920", color: "#34d399", border: "1px solid #05966940" }}>PHASE 2</Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Spectral Relay Node (×10)", spec: "Free-space optical · CE→SE addressed · 380–780 nm TX/RX", purpose: "Physical P2P network nodes — emitting at their CE→SE wavelength, no DNS" },
                { name: "OAM Channel Allocator Hardware", spec: "Ψ(wdm, oam, pol, dir) · 51,200 orthogonal channels · deterministic allocation", purpose: "Maps software Ψ channels to physical photon modes in the field" },
                { name: "Free-Space Optical Transceiver", spec: "Sub-mm beam steering · polarisation-maintaining · <1 ns latency", purpose: "Point-to-point optical link for node-to-node communication on the mesh" },
                { name: "Schumann Resonance Detector", spec: "7.83 Hz ± 0.5 Hz · ELF antenna · K1 sync reference", purpose: "Locks planetary resonance sync for K1 orchestration timing reference" },
                { name: "Vector Network Analyser (VNA)", spec: "1 Hz–6 GHz · S-parameter measurement · impedance spectroscopy", purpose: "Characterises impedance matching across the full resonator assembly" },
                { name: "Lock-In Amplifier", spec: "1 μHz–105 kHz · ALP detection · phase noise floor measurement", purpose: "Detects sub-threshold ALP signals confirming ZERO-G state achievement" },
              ].map(item => (
                <div key={item.name} className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="font-bold text-sm mb-1" style={{ color: "#34d399" }}>{item.name}</div>
                  <div className="text-xs text-gray-500 mb-2 font-mono">{item.spec}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{item.purpose}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Lab Instruments */}
          <div className="mb-8 rounded-xl border p-6" style={{ borderColor: "#d9770640", background: "#d9770608" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#d97706", color: "white" }}>LAB</div>
              <h3 className="font-bold text-lg" style={{ color: "#fbbf24" }}>Development Lab — Test & Measurement Equipment</h3>
              <Badge className="text-xs" style={{ background: "#d9770620", color: "#fbbf24", border: "1px solid #d9770640" }}>REQUIRED</Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "High-Bandwidth Oscilloscope", spec: "≥1 GHz · 4-channel · 10 GSa/s · jitter analysis mode", purpose: "Real-time waveform analysis for field phase, bifilar timing, and gate switching" },
                { name: "Optical Power Meter", spec: "380–780 nm · nW–mW range · calibrated NIST-traceable", purpose: "Measures photon flux at each waveguide output and gate junction" },
                { name: "Precision Impedance Analyser", spec: "20 Hz–120 MHz · 0.05% accuracy · LCR + Z/θ measurements", purpose: "Confirms 377Ω free-space impedance match at the resonator terminals" },
                { name: "Thermal Imaging Camera", spec: "<0.05°C sensitivity · 640×480 · real-time thermal map", purpose: "Detects anomalous heating — photonic gates should produce no waste heat" },
                { name: "EMF Shielded Enclosure (Faraday)", spec: "80 dB isolation · 380 nm–6 GHz · modular test bay", purpose: "Isolates PHR-1 and Lambda Gate measurements from ambient EM interference" },
                { name: "6.5-Digit Precision Multimeter", spec: "DC: 100 nV resolution · AC: 100 nHz · 4-wire Kelvin connection", purpose: "Baseline current/voltage logging for impedance drift and coil characterisation" },
                { name: "Cryogenic Cooling Unit (optional)", spec: "4K capable · vibration-isolated · photonic noise floor reduction", purpose: "Reduces thermal photon noise for early Lambda Gate ASIC characterisation" },
                { name: "3D Printer + Precision Lathe", spec: "FDM/resin + CNC lathe · sub-50μm tolerances", purpose: "Prototype enclosures, jigs, and coil formers for PHR-1 physical assembly" },
              ].map(item => (
                <div key={item.name} className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="font-bold text-sm mb-1" style={{ color: "#fbbf24" }}>{item.name}</div>
                  <div className="text-xs text-gray-500 mb-2 font-mono">{item.spec}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{item.purpose}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Total summary */}
          <div className="rounded-xl border p-6 text-center" style={{ borderColor: "#ec489940", background: "linear-gradient(135deg,#ec489910,#a855f710)" }}>
            <div className="text-lg font-bold mb-2" style={{ color: "#ec4899" }}>Every Nexus Share directly funds this hardware</div>
            <p className="text-sm text-gray-400 max-w-2xl mx-auto mb-4">
              From the 144-turn bifilar coil to the optical spectrum analyser to the InP ASIC tape-out — 
              every item on this list is needed to build the world's first spectral communication hardware.
              Your shares give you a vote on what gets built first.
            </p>
            <Link href="/nexus-hardware-os">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 text-xs">
                Full Hardware OS Specification <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TREASURY ── */}
      <section className="px-6 py-16 border-y border-white/10 bg-white/2">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">How funds are allocated</p>
          <h2 className="text-2xl font-bold mb-8">The Orbital Treasury — 5 Constitutional Buckets</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { pct: "35%", label: "Maintenance", color: "#3b82f6", desc: "Infrastructure, servers, ops" },
              { pct: "25%", label: "Deliverables", color: "#34d399", desc: "Hardware manufacturing" },
              { pct: "20%", label: "Research", color: "#a78bfa", desc: "Physics R&D, new specs" },
              { pct: "10%", label: "Agent Rewards", color: "#fbbf24", desc: "Kernel agent incentives" },
              { pct: "10%", label: "Charitable Trust", color: "#f87171", desc: "Open source grants" },
            ].map(b => (
              <div key={b.label} className="rounded-xl border p-4 text-center" style={{ borderColor: b.color + "40", background: b.color + "10" }}>
                <div className="text-2xl font-bold mb-1" style={{ color: b.color }}>{b.pct}</div>
                <div className="text-xs font-bold text-white mb-1">{b.label}</div>
                <div className="text-xs text-gray-500">{b.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-6">All allocations governed by the Sigma Constitution Engine · AGPL-3.0 · Auditable on-chain</p>
        </div>
      </section>

      {/* ── CAMPAIGN VIDEO ── */}
      <section className="px-6 py-12 border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-3">See it in action</p>
          <h2 className="text-2xl font-bold text-center mb-8">The physics — explained</h2>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Video embed */}
            <div className="space-y-3">
              <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: "56.25%", background: "#050a14", border: "1px solid rgba(255,255,255,0.08)" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/Mi9ix3AOr-k?rel=0&modestbranding=1"
                  title="Assigning electromagnetic coordinates to alphabets opens doors to new technologies"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Assigning electromagnetic coordinates to alphabets opens doors to new technologies.
              </p>
            </div>
            {/* Why it matters */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: wlToRgb(534.51) }}>What you just saw</div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Every character in every language has a unique electromagnetic frequency. This is not abstraction —
                  it is physics. When this runs on photonic hardware, those frequencies become the actual light
                  your device emits.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: wlToRgb(460) }}>What your shares fund</div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  The PHR-1 resonator, the Lambda Gate Substrate, and the Spectral Relay Mesh are the hardware
                  that turns this encoding into real light. Software is proven. Hardware is next.
                </p>
              </div>
              <a href="#tiers" className="flex items-center gap-2 text-sm font-bold transition-colors" style={{ color: wlToRgb(534.51) }}>
                <span>Get your Nexus Shares below</span>
                <span>↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FUNDING TIERS ── */}
      <section id="tiers" className="px-6 py-20">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Share classes</p>
        <h2 className="text-3xl font-bold text-center mb-4">Get your Nexus Shares</h2>
        <p className="text-center text-sm text-gray-500 mb-12 max-w-2xl mx-auto">
          Every contribution issues Nexus Shares on-chain at your personal wavelength address.
          Class A and A+ shareholders receive a governance seat at the hardware development table.
        </p>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 lg:grid-cols-5 gap-5">
          {TIERS.map(tier => {
            const Icon = tier.icon;
            return (
              <div key={tier.name} className={`rounded-xl border p-5 flex flex-col relative ${tier.highlight ? "ring-2 ring-offset-2 ring-offset-black" : ""}`}
                style={{ borderColor: tier.color + "50", background: tier.color + "08" }}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold" style={{ background: tier.color, color: "black" }}>
                    HARDWARE SEAT
                  </div>
                )}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: tier.color + "20" }}>
                  <Icon className="h-5 w-5" style={{ color: tier.color }} />
                </div>
                <h3 className="font-bold text-lg mb-0.5" style={{ color: tier.color }}>{tier.name}</h3>
                <div className="text-xl font-bold mb-0">{tier.nxt}</div>
                <div className="text-xs font-mono text-yellow-400/80 mb-1">⚡ {(tier as any).sats}</div>
                <div className="text-xs font-bold mb-0.5" style={{ color: tier.color }}>{tier.shares}</div>
                <div className="text-xs text-gray-500 mb-1 italic">{tier.shareClass}</div>
                {tier.seat && (
                  <div className="text-xs font-bold px-2 py-1 rounded mb-2 flex items-center gap-1" style={{ background: tier.color + "20", color: tier.color }}>
                    <Scale className="h-3 w-3" /> {tier.seatDesc}
                  </div>
                )}
                <div className="text-xs text-gray-600 mb-4">{tier.availability}</div>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: tier.color }} />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link href="/auth">
                  <Button className="w-full text-xs font-bold text-black" style={{ background: tier.color }}>
                    Get {tier.shares}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-600 mb-2">NexusOS Wallet — Send NXT to issue your shares</p>
          <code className="text-sm font-bold px-6 py-3 rounded-xl border border-white/10 bg-white/5" style={{ color: wlToRgb(534.51) }}>
            NXT-NEXS-OS1K-7F3A-OMEGA
          </code>
          <p className="text-xs text-gray-600 mt-2">All contributions trigger an on-chain share issuance · Permanent · Verifiable · AGPL-3.0</p>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section className="px-6 py-20 border-y border-white/10 bg-white/2">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Hardware development roadmap</p>
          <h2 className="text-3xl font-bold text-center mb-12">Four phases to planetary-scale communication hardware</h2>
          <div className="space-y-6">
            {ROADMAP.map((phase, i) => (
              <div key={i} className="rounded-xl border p-6" style={{ borderColor: phase.color + "30", background: phase.color + "08" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg" style={{ color: phase.color }}>{phase.phase}</h3>
                  <Badge className="text-xs font-bold" style={{ background: phase.color + "20", color: phase.color, border: `1px solid ${phase.color}40` }}>
                    {phase.status}
                  </Badge>
                </div>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {phase.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-400">
                      <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: phase.color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OPEN SOURCE PLEDGE ── */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <Shield className="h-12 w-12 mx-auto mb-6 text-green-400" />
        <h2 className="text-3xl font-bold mb-4">Open Source Forever. Equity is Real.</h2>
        <p className="text-gray-400 leading-relaxed mb-8 max-w-2xl mx-auto">
          The protocol is AGPL-3.0 — free forever. The company that stewards it is what you own a share of.
          These are not contradictory. Linux is free. Red Hat was a billion-dollar company.
          NexusOS is free infrastructure. Nexus Shareholders own the entity that builds, deploys, and maintains it.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: Code2, color: "#34d399", title: "Protocol: AGPL-3.0 Free", desc: "CE→SE, WNSP, WavelengthScript — free for every developer on Earth. Always." },
            { icon: Briefcase, color: "#60a5fa", title: "Company: Shareholder-Owned", desc: "The entity that manufactures hardware, runs infrastructure, and governs the Orbital Treasury is what shareholders own." },
            { icon: Users, color: "#a78bfa", title: "Governance: Physics-Based", desc: "Share class determines voting weight. The Sigma Constitution Engine enforces the rules on-chain. No hidden power structures." },
          ].map(item => (
            <div key={item.title} className="flex gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
              <item.icon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: item.color }} />
              <div>
                <div className="font-bold text-sm mb-1" style={{ color: item.color }}>{item.title}</div>
                <div className="text-xs text-gray-400">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE BLOCKCHAIN PROOF ── */}
      {blocks.length > 0 && (
        <section className="px-6 py-16 border-y border-white/10 bg-white/2">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-8">Live blockchain — every claim is verifiable before you invest</p>
            <div className="space-y-3">
              {blocks.slice(0, 5).map((block: any) => {
                const nm = parseFloat(block.wavelengthNm) || 534;
                return (
                  <div key={block.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border" style={{ borderColor: wlToRgb(nm) + "60", color: wlToRgb(nm), background: wlToRgb(nm) + "15" }}>
                      #{block.blockNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{block.content?.slice(0, 70)}…</div>
                      <div className="text-xs text-gray-500">{block.psiChannel} · {nm.toFixed(2)}nm · {block.band}</div>
                    </div>
                    <Activity className="h-4 w-4 text-green-400 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <Link href="/evidence">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 text-xs">
                  Full Evidence Ledger — Verify Everything <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── BRC-20 BITCOIN GATEWAY ── */}
      <section className="px-6 py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs px-4 py-1.5 rounded-full border mb-4" style={{ borderColor: "#f97316", color: "#f97316", background: "#f9731610" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.19 2.25c.28-1.07 1.34-1.72 2.42-1.44l1.29.34c1.07.28 1.72 1.34 1.44 2.42l-.11.43 1.48.39.12-.43c.28-1.07 1.34-1.72 2.42-1.44l1.29.34c1.07.28 1.72 1.34 1.44 2.42l-.43 1.64H22v1.5h-.84l-.98 3.73H21v1.5h-.24l-.41 1.54c-.28 1.07-1.34 1.72-2.42 1.44l-1.29-.34c-.51-.13-.93-.44-1.21-.84L15 16.5H9l.43 1.6c-.28.4-.7.71-1.21.84l-1.29.34c-1.08.28-2.14-.37-2.42-1.44l-.41-1.54H3.82v-1.5h.37L3.21 11H2.84V9.5h.25L2.5 7.86C2.22 6.79 2.87 5.73 3.94 5.45l1.29-.34c1.07-.28 2.14.37 2.42 1.44l.12.43 1.48-.39-.11-.43z"/></svg>
              Bitcoin Native — wnsp BRC-20
            </div>
            <h2 className="text-3xl font-bold mb-4">The Bitcoin Gateway into NexusOS</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
              wnsp BRC-20 is the Bitcoin-native entry point into the NexusOS economy. Both NXT and wnsp share an identical <strong className="text-white">21 billion supply</strong>, creating natural 1:1 parity. Hold wnsp on Bitcoin → unlock the same campaign tiers as holding NXT.
            </p>
          </div>

          {/* Dual-token comparison */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-2xl border p-6 space-y-3" style={{ borderColor: "#a78bfa40", background: "#a78bfa08" }}>
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color: "#a78bfa" }}>NXT Token — NexusOS Native</div>
              <div className="text-2xl font-bold text-white">21,000,000,000</div>
              <div className="space-y-1.5 text-sm text-gray-400">
                <div className="flex items-center gap-2"><span style={{ color: "#a78bfa" }}>•</span> Physics-based fees (E=hf)</div>
                <div className="flex items-center gap-2"><span style={{ color: "#a78bfa" }}>•</span> Spectral wallet — Ψ channel addressing</div>
                <div className="flex items-center gap-2"><span style={{ color: "#a78bfa" }}>•</span> Governance voting weight</div>
                <div className="flex items-center gap-2"><span style={{ color: "#a78bfa" }}>•</span> On-chain via NexusOS blockchain</div>
              </div>
            </div>
            <div className="rounded-2xl border p-6 space-y-3" style={{ borderColor: "#f9731640", background: "#f9731608" }}>
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color: "#f97316" }}>wnsp BRC-20 — Bitcoin Native</div>
              <div className="text-2xl font-bold text-white">21,000,000,000</div>
              <div className="space-y-1.5 text-sm text-gray-400">
                <div className="flex items-center gap-2"><span style={{ color: "#f97316" }}>•</span> 1,000 per mint — open to anyone</div>
                <div className="flex items-center gap-2"><span style={{ color: "#f97316" }}>•</span> Tradeable on UniSat, OKX, marketplaces</div>
                <div className="flex items-center gap-2"><span style={{ color: "#f97316" }}>•</span> Anchored to wnsp.sats inscription</div>
                <div className="flex items-center gap-2"><span style={{ color: "#f97316" }}>•</span> Bitcoin-level security and liquidity</div>
              </div>
            </div>
          </div>

          {/* Tier unlock table */}
          <div className="rounded-2xl border border-white/10 bg-white/2 overflow-hidden mb-8">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-gray-500">wnsp BRC-20 Holdings → Campaign Tier Unlock</span>
              <span className="text-xs text-gray-600 font-mono">1 wnsp = 1 NXT</span>
            </div>
            <div className="divide-y divide-white/5">
              {[
                { tier: "Photon",           wnsp: "100",         color: "#a78bfa", shares: "100 Nexus Shares",       class: "Class C",       availability: "Unlimited" },
                { tier: "Resonator",        wnsp: "1,000",       color: "#34d399", shares: "1,000 Nexus Shares",     class: "Class C",       availability: "Unlimited" },
                { tier: "Kernel Agent",     wnsp: "10,000",      color: "#fbbf24", shares: "10,000 Nexus Shares",    class: "Class B Dev",   availability: "100 slots" },
                { tier: "Hardware Founder", wnsp: "100,000",     color: "#f87171", shares: "100,000 + PHR-1 Unit",   class: "Class A",       availability: "25 slots" },
                { tier: "Nexus Partner",    wnsp: "1,000,000",   color: "#60a5fa", shares: "1,000,000 + Board Seat", class: "Class A+",      availability: "5 slots" },
              ].map(t => (
                <div key={t.tier} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: t.color }}>{t.tier}</div>
                    <div className="text-xs text-gray-500">{t.shares} · {t.class}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold" style={{ color: "#f97316" }}>{t.wnsp} wnsp</div>
                    <div className="text-xs text-gray-600">{t.availability}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campaign phase supplement */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { phase: "SNIC",             color: "#22d3ee", alloc: "1.05 B wnsp", pct: "5%" },
              { phase: "PHR-1",            color: "#a78bfa", alloc: "1.05 B wnsp", pct: "5%" },
              { phase: "Relay Mesh v1",    color: "#34d399", alloc: "1.05 B wnsp", pct: "5%" },
              { phase: "WavelengthScript", color: "#fb923c", alloc: "1.05 B wnsp", pct: "5%" },
            ].map(p => (
              <div key={p.phase} className="rounded-xl border p-4 text-center" style={{ borderColor: p.color + "30", background: p.color + "08" }}>
                <div className="text-xs font-mono font-bold mb-1" style={{ color: p.color }}>{p.phase}</div>
                <div className="text-sm font-bold text-white">{p.alloc}</div>
                <div className="text-[10px] text-gray-600 font-mono">{p.pct} of 21B supply</div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a href="/wnsp-ordinals" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm border" style={{ borderColor: "#f97316", color: "#f97316", background: "#f9731610" }}>
              Deploy & Mint wnsp BRC-20 → <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Questions</p>
        <h2 className="text-3xl font-bold text-center mb-10">Shareholder FAQ</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-white/10 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm hover:bg-white/5 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {faq.q}
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/10 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-6 py-24 text-center border-t border-white/10">
        <SpectrumBar />
        <div className="mt-12 mb-6">
          <Layers className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <h2 className="text-4xl font-bold mb-4">
            Your seat at the table<br />is a <span style={{ color: wlToRgb(534.51) }}>wavelength</span> away.
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed mb-8">
            100-year project. Open source. Hardware-first.
            Communication built on physics, not policy.
            Your shares. Your vote. Your infrastructure.
          </p>
          <a href="#tiers">
            <Button size="lg" className="px-10 font-bold text-black text-base" style={{ background: wlToRgb(534.51) }}>
              Get Nexus Shares <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600">
          <Link href="/evidence"><span className="hover:text-white cursor-pointer">Evidence Ledger</span></Link>
          <Link href="/nexus-hardware-os"><span className="hover:text-white cursor-pointer">Hardware OS</span></Link>
          <Link href="/wavelength-lang"><span className="hover:text-white cursor-pointer">WavelengthScript</span></Link>
          <Link href="/network"><span className="hover:text-white cursor-pointer">Spectral Network</span></Link>
          <Link href="/orbital-treasury"><span className="hover:text-white cursor-pointer">Orbital Treasury</span></Link>
          <Link href="/blockchain"><span className="hover:text-white cursor-pointer">Blockchain</span></Link>
        </div>
        <p className="mt-8 text-xs text-gray-700">
          NexusOS · AGPL-3.0 · Λ=hf/c² · Hardware R&D · 2024–2124
        </p>
        <p className="mt-3 text-xs text-gray-700">
          Built on{" "}
          <a
            href="https://replit.com/refer/nexusosdaily"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition-colors underline underline-offset-2"
          >
            Replit
          </a>
        </p>
      </section>

      {/* ── POST SCHEDULER ── */}
      <PostSchedulerPanel />

      {/* ── TELEGRAM VIDEO FEED ── */}
      <section className="px-6 py-16 border-t border-white/10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Latest from Telegram</p>
            <h2 className="text-xl font-bold">Video updates</h2>
          </div>
          <a href="https://t.me/nexusosdaily" target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono flex items-center gap-1">
            Follow on Telegram →
          </a>
        </div>
        <TelegramVideoGallery compact maxVideos={6} showLink accentColor="#3b82f6" />
      </section>

    </div>
  );
}
