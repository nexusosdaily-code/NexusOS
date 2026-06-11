import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import WelcomeModal from "@/components/WelcomeModal";
import { useUnisat } from "@/hooks/use-unisat";
import TelegramVideoGallery from "@/components/TelegramVideoGallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Mail, Radio, FileText, Upload, ArrowRightLeft, Bitcoin,
  Activity, Layers, Cpu, Code2, Wallet, Globe2,
  Zap, Atom, Waves, Rocket, Users, Database,
  Shield, BookOpen, HardDrive, GitBranch,
  ChevronRight, Rss, Eye, Clock,
  MessageSquarePlus, MonitorPlay, FilePlus, Sparkles, Key, Scale, LogOut, Settings, User, Search,
  CheckCircle2, AlertTriangle, ArrowRight, FlaskConical, Heart,
  Copy, ExternalLink, RefreshCw, ChevronDown, ChevronUp, ShoppingBag,
  Gem, Coins, TrendingUp, Unplug, DollarSign, Megaphone,
  ArrowDownToLine, LayoutDashboard, Droplets, Gift, Trophy,
} from "lucide-react";

// ── Physics constants ──────────────────────────────────────────────────
const C_LIGHT  = 299_792_458;
const H_PLANCK = 6.626e-34;

// ── Authority band config ──────────────────────────────────────────────
const BAND_META: Record<string, { label: string; color: string; bg: string; range: string }> = {
  SYSTEM:  { label: "SYSTEM",  color: "#8b00ff", bg: "rgba(139,0,255,0.15)",   range: "WDM 0–63" },
  KERNEL:  { label: "KERNEL",  color: "#2563eb", bg: "rgba(37,99,235,0.15)",   range: "WDM 64–127" },
  USER:    { label: "USER",    color: "#16a34a", bg: "rgba(22,163,74,0.15)",   range: "WDM 128–191" },
  GUEST:   { label: "GUEST",   color: "#d97706", bg: "rgba(217,119,6,0.15)",   range: "WDM 192–255" },
};

function getBandFromWdm(wdm: number): string {
  if (wdm < 64)  return "SYSTEM";
  if (wdm < 128) return "KERNEL";
  if (wdm < 192) return "USER";
  return "GUEST";
}

// ── Feed item types ────────────────────────────────────────────────────
type FeedType = "all" | "message" | "stream" | "document" | "upload" | "transaction";

interface FeedItem {
  id: string;
  type: string;
  title: string;
  preview: string;
  meta: Record<string, unknown>;
  href: string;
  createdAt: string;
}

// ── Item type config ───────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, {
  label: string; Icon: typeof Mail; color: string; bg: string;
}> = {
  message:     { label: "Message",     Icon: Mail,           color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
  stream:      { label: "Stream",      Icon: Radio,          color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  document:    { label: "Document",    Icon: FileText,        color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  upload:      { label: "Upload",      Icon: Upload,          color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  transaction: { label: "Transaction", Icon: ArrowRightLeft,  color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
};

// ── App navigation sections (compact) ─────────────────────────────────
const APP_SECTIONS = [
  {
    label: "Communications",
    accent: "#22d3ee",
    items: [
      { title: "Inbox",        href: "/inbox",          Icon: Mail },
      { title: "Live Streams", href: "/streaming",      Icon: Radio },
      { title: "Transmission", href: "/workspace/transmission", Icon: Waves },
      { title: "Encoding Lab", href: "/encoding-lab",   Icon: Atom },
      { title: "Directory",    href: "/directory",      Icon: Users },
    ],
  },
  {
    label: "Data & Storage",
    accent: "#2563eb",
    items: [
      { title: "Ledger",        href: "/ledger",          Icon: Scale },
      { title: "Blockchain",    href: "/blockchain",     Icon: Layers },
      { title: "Spectral DB",   href: "/spectral-db",    Icon: Database },
      { title: "Secure Docs",   href: "/secure-docs",    Icon: FileText },
      { title: "Agent Bus",     href: "/agent-bus",      Icon: Activity },
    ],
  },
  {
    label: "Infrastructure",
    accent: "#d97706",
    items: [
      { title: "Nexus Command", href: "/nexus-command",   Icon: Layers },
      { title: "K1 Platform",   href: "/k1",             Icon: Rocket },
      { title: "Kernel",        href: "/kernel",          Icon: Cpu },
      { title: "WNSP Coord.",   href: "/wnsp/coordinator",Icon: Globe2 },
      { title: "Governance",    href: "/governance",       Icon: Scale },
      { title: "Constitution",  href: "/constitution",    Icon: Shield },
      { title: "Founders Charity", href: "/founders-charity", Icon: Heart },
      { title: "SOP",           href: "/sop",             Icon: Radio },
      { title: "Hardware Lab",  href: "/hardware-lab",    Icon: FlaskConical },
      { title: "Settings",      href: "/settings",        Icon: Settings },
    ],
  },
  {
    label: "Developer",
    accent: "#16a34a",
    items: [
      { title: "⚡ CE-SE Pipeline", href: "/ce-se-pipeline", Icon: Zap },
      { title: "API Keys",      href: "/developer/keys",  Icon: Key },
      { title: "GitHub Bridge", href: "/github",          Icon: GitBranch },
      { title: "CE Writer",     href: "/ce-code-writer",   Icon: Code2 },
      { title: "WavelengthScript", href: "/wavelength-lang", Icon: Cpu },
      { title: "Spectral Lib.", href: "/spectral-library",Icon: BookOpen },
      { title: "Analytics",     href: "/workspace/analytics", Icon: Activity },
    ],
  },
  {
    label: "Spectral Tools",
    accent: "#a78bfa",
    items: [
      { title: "Photonic Ledger",  href: "/photonic-ledger",     Icon: Layers },
      { title: "Hardware Spec",    href: "/hardware-spec",       Icon: Shield },
      { title: "P2P Sync Terminal",href: "/p2p-terminal",        Icon: Radio },
      { title: "WNSP VM",          href: "/wnsp-vm",             Icon: Cpu },
      { title: "Spectral Router",  href: "/spectral-router",     Icon: Radio },
      { title: "Spectral Search",  href: "/spectral-search",     Icon: Search },
      { title: "Compression Exp.", href: "/compression-explorer",Icon: Layers },
      { title: "Spectral Contracts",href: "/spectral-contracts", Icon: FileText },
    ],
  },
  {
    label: "Build",
    accent: "#22d3ee",
    items: [
      { title: "🗺️ Roadmap",                             href: "/roadmap",            Icon: Waves },
      { title: "🔌 How to Plug In",                     href: "/how-to-plug-in",     Icon: Zap },
      { title: "Oscillating Quanta — First Principles", href: "/oscillating-quanta", Icon: Waves },
      { title: "CE-SE Pipeline",                         href: "/ce-se-pipeline",     Icon: Zap },
      { title: "Planck Alignment",                      href: "/planck-alignment",   Icon: Zap },
    ],
  },
  {
    label: "Research",
    accent: "#f472b6",
    items: [
      { title: "WNSP Protocol Spec",  href: "/protocol",        Icon: Radio },
      { title: "NexusOS Pipeline",   href: "/pipeline",        Icon: Layers },
      { title: "Spectral Mirror",    href: "/spectral-mirror", Icon: Radio },
      { title: "WNSP Paper",         href: "/wnsp-paper",      Icon: BookOpen },
      { title: "Reposed Theory",     href: "/reposed-theory",  Icon: Zap },
      { title: "Start",              href: "/start",            Icon: Rocket },
    ],
  },
  {
    label: "Campaign",
    accent: "#f97316",
    items: [
      { title: "🚀 Campaign Hub",  href: "/campaign",     Icon: Rocket },
      { title: "Indiegogo",        href: "/indiegogo",    Icon: Zap },
      { title: "Crowdfund",        href: "/crowdfund",    Icon: Users },
      { title: "Evidence",         href: "/evidence",     Icon: Eye },
      { title: "SNIC Spec",        href: "/snic",         Icon: Cpu },
      { title: "₿ Bitcoin Bridge",    href: "/wnsp/ordinals",    Icon: Bitcoin },
      { title: "🟠 Community Mint",   href: "/community-mint",   Icon: Zap },
      { title: "💎 wnsp Staking",     href: "/wnsp-staking",     Icon: Database },
      { title: "🛒 Marketplace",      href: "/marketplace",      Icon: ShoppingBag },
      { title: "💜 NEXUS•WAVELENGTH", href: "/rune-etching",     Icon: Gem },
      { title: "🔮 Mint Runes",       href: "/rune-mint",        Icon: Coins },
      { title: "📈 Rune Staking",     href: "/rune-staking",     Icon: TrendingUp },
      { title: "🔵 Fractal BTC",      href: "/fractal-btc",      Icon: Globe2 },
      { title: "↔ NXT↔FB Swap",      href: "/nxt-fb-swap",      Icon: ArrowRightLeft },
      { title: "⚡ Lightning Wallet",  href: "/lightning-wallet", Icon: Zap },
      { title: "📥 Receive",           href: "/receive",             Icon: ArrowDownToLine },
      { title: "📊 Portfolio",         href: "/portfolio",           Icon: LayoutDashboard },
      { title: "💧 Liquidity Pools",   href: "/lp-pools",            Icon: Droplets },
      { title: "🟢 WNUSD Stablecoin", href: "/stablecoin",          Icon: DollarSign },
      { title: "🛡 Wallet Sentinel",   href: "/btc-sentinel",        Icon: Shield },
      { title: "🖼 Assets Sentinel",  href: "/btc-assets-sentinel", Icon: Layers },
      { title: "📡 Mempool Monitor",  href: "/mempool",             Icon: Activity },
      { title: "📣 NXT Campaign",     href: "/nxt-campaign",        Icon: Megaphone },
      { title: "🎁 NXT Airdrop",      href: "/airdrop",             Icon: Gift },
      { title: "🔮 Nostr Bridge",     href: "/nostr-bridge",        Icon: Radio },
      { title: "🎯 Coinsniper",       href: "/coinsniper",          Icon: Rocket },
      { title: "🏆 Genesis Quest",    href: "/quest",               Icon: Trophy },
      { title: "💜 Rune ↔ NXT Swap", href: "/rune-swap",           Icon: ArrowRightLeft },
      { title: "🟠 NXT→NXWV Pipeline", href: "/rune-pipeline",    Icon: Layers },
      { title: "⚡ Stake & Earn",      href: "/stake-earn",       Icon: TrendingUp },
      { title: "📦 Spectral Bundle",   href: "/spectral-bundle",  Icon: Layers },
      { title: "💜 Join the Team",     href: "/join-community",   Icon: Users },
    ],
  },
  {
    label: "Community",
    accent: "#f97316",
    items: [
      { title: "Community",    href: "/community",    Icon: Users },
      { title: "Telegram Hub", href: "/telegram-hub", Icon: Radio },
      { title: "Quora Kit",    href: "/quora",        Icon: Globe2 },
      { title: "Reddit Kit",   href: "/reddit",       Icon: Globe2 },
      { title: "Media Library",href: "/media-library",Icon: Database },
    ],
  },
];

// ── Time formatter ─────────────────────────────────────────────────────
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Identity Rail ──────────────────────────────────────────────────────
function BtcWalletPill() {
  const { available, connected, address, balance, connect, disconnect, providerName } = useUnisat();
  const [open, setOpen] = useState(false);

  const fmtAddr = (a: string) => a.slice(0, 7) + "…" + a.slice(-5);
  const fmtSats = (n: number) => n >= 100_000_000 ? (n / 100_000_000).toFixed(4) + " BTC" : n >= 1_000 ? (n / 1_000).toFixed(1) + "K sats" : n + " sats";

  if (!available) return (
    <a href="https://unisat.io" target="_blank" rel="noreferrer"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-orange-500/60 hover:text-orange-400 border border-orange-500/10 hover:border-orange-500/30 transition-all"
      title="Install UniSat to connect Bitcoin wallet"
    >
      <Bitcoin className="w-3.5 h-3.5" />
      <span className="hidden md:inline">Install UniSat</span>
    </a>
  );

  if (!connected) return (
    <button onClick={connect}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-orange-400/70 hover:text-orange-300 border border-orange-500/20 hover:border-orange-400/50 hover:bg-orange-500/10 transition-all"
      data-testid="button-btc-connect-rail"
      title={`Connect ${providerName}`}
    >
      <Bitcoin className="w-3.5 h-3.5" />
      <span className="hidden md:inline">Connect BTC</span>
    </button>
  );

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-all"
        style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.35)" }}
        data-testid="button-btc-wallet-pill"
        title={address ?? ""}
      >
        <Bitcoin className="w-3.5 h-3.5" />
        <span className="hidden sm:inline font-mono">{address ? fmtAddr(address) : "Connected"}</span>
        {balance && <span className="hidden lg:inline text-orange-300/70">· {fmtSats(balance.confirmed)}</span>}
        <ChevronDown className="w-3 h-3 text-orange-500/60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 min-w-[220px]"
          onMouseLeave={() => setOpen(false)}>
          <div className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider mb-2">Bitcoin Wallet</div>
          <div className="text-[10px] text-slate-500 font-mono break-all mb-1">{address}</div>
          {balance && (
            <div className="text-xs text-slate-300 mb-3">
              <span className="text-orange-300 font-mono">{fmtSats(balance.confirmed)}</span>
              {balance.unconfirmed > 0 && <span className="text-slate-600 ml-2">(+{fmtSats(balance.unconfirmed)} unconfirmed)</span>}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Link href="/marketplace">
              <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-2"
                onClick={() => setOpen(false)}>
                <ShoppingBag className="w-3 h-3 text-orange-400" />Marketplace
              </button>
            </Link>
            <Link href="/wnsp-ordinals">
              <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-2"
                onClick={() => setOpen(false)}>
                <Gem className="w-3 h-3 text-purple-400" />My Ordinals
              </button>
            </Link>
            <Link href="/btc-assets-sentinel">
              <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-2"
                onClick={() => setOpen(false)}>
                <Activity className="w-3 h-3 text-cyan-400" />Asset Sentinel
              </button>
            </Link>
            <Link href="/rune-staking">
              <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-2"
                onClick={() => setOpen(false)}>
                <Coins className="w-3 h-3 text-yellow-400" />Rune Staking
              </button>
            </Link>
            <Link href="/coinsniper">
              <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-2"
                onClick={() => setOpen(false)}>
                <Rocket className="w-3 h-3 text-purple-400" />Coinsniper
              </button>
            </Link>
            <Link href="/rune-swap">
              <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-2"
                onClick={() => setOpen(false)}>
                <ArrowRightLeft className="w-3 h-3 text-orange-400" />Rune ↔ NXT
              </button>
            </Link>
          </div>
          <button onClick={() => { disconnect(); setOpen(false); }}
            className="mt-2 flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-red-400 hover:bg-red-900/10 rounded transition-colors border-t border-slate-800 pt-2">
            <Unplug className="w-3 h-3" />Disconnect wallet
          </button>
        </div>
      )}
    </div>
  );
}

function IdentityRail({
  user, wallet, unread, avatarUrl,
}: {
  user: { id: string; username: string; spectralWdm?: number; spectralOam?: number; spectralPol?: string };
  wallet?: { address: string; balance: string };
  unread: number;
  avatarUrl?: string | null;
}) {
  const { logout } = useAuth();
  const wdm  = user.spectralWdm  ?? 228;
  const oam  = user.spectralOam  ?? 45;
  const pol  = user.spectralPol  ?? "H";
  const band = getBandFromWdm(wdm);
  const meta = BAND_META[band];
  const nmPerWdm = (780 - 380) / 256;
  const nm   = 380 + wdm * nmPerWdm;
  const freqHz   = C_LIGHT / (nm * 1e-9);
  const energyJ  = H_PLANCK * freqHz;
  const lambdaKg = energyJ / (C_LIGHT * C_LIGHT);
  const balNum   = parseFloat(wallet?.balance ?? "0");

  const { data: lnData } = useQuery<{ satsBalance: number }>({
    queryKey: ["/api/lightning/balance"],
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const satsNum = lnData?.satsBalance ?? 0;
  const fmtSatsNav = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
    : `${n}`;

  const { data: mktData } = useQuery<{ btcUsd: number; nxtUsd: number; satUsd: number }>({
    queryKey: ["/api/market/price"],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const nxtUsd = mktData?.nxtUsd ?? null;
  const satUsd = mktData?.satUsd ?? null;

  return (
    <div
      data-testid="identity-rail"
      style={{ borderBottom: `1px solid ${meta.color}30`, background: "hsl(222 47% 6%)" }}
      className="sticky top-0 z-50 flex items-center gap-4 px-6 py-3 flex-wrap"
    >
      {/* Avatar + username → profile */}
      <Link href={`/profile/${user.username}`} data-testid="link-my-profile">
        <div className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity">
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}60` }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" data-testid="img-hub-avatar" />
              : user.username[0].toUpperCase()
            }
          </div>
          <span className="font-semibold text-white text-sm truncate">{user.username}</span>
        </div>
      </Link>

      {/* Ψ channel */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono flex-shrink-0"
        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
      >
        <Sparkles className="w-3 h-3" />
        Ψ({wdm},{oam},{pol}) · {nm.toFixed(1)}nm
      </div>

      {/* Authority band */}
      <div
        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold flex-shrink-0"
        style={{ background: meta.bg, color: meta.color }}
      >
        <Shield className="w-3 h-3" />
        {band}
      </div>

      {/* Physics */}
      <div className="text-xs text-white/40 font-mono hidden lg:block flex-shrink-0">
        E={energyJ.toExponential(2)}J · Λ={lambdaKg.toExponential(2)}kg
      </div>

      <div className="flex-1" />

      {/* Unread badge */}
      {unread > 0 && (
        <Link href="/inbox">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer text-xs"
            style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}>
            <Mail className="w-3.5 h-3.5" />
            {unread} unread
          </div>
        </Link>
      )}

      {/* ⚡ Lightning sats — primary spending balance */}
      <Link href="/lightning-wallet">
        <div className="flex flex-col items-end gap-0 px-3 py-1 rounded cursor-pointer text-xs font-mono"
          style={{ background: "rgba(250,204,21,0.10)", color: "#facc15", border: "1px solid rgba(250,204,21,0.28)" }}>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {fmtSatsNav(satsNum)} sats
          </div>
          <div className="text-[8px] opacity-50 tracking-wide">LIGHTNING</div>
        </div>
      </Link>

      {/* NXT Hardware Fund Balance — shows live USD price derived from BTC */}
      <Link href="/wallet">
        <div className="flex flex-col items-end gap-0 px-3 py-1 rounded cursor-pointer text-xs font-mono"
          style={{ background: "rgba(139,0,255,0.10)", color: "#a855f7", border: "1px solid rgba(139,0,255,0.25)" }}>
          <div className="flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            {balNum >= 1e6
              ? `${(balNum / 1e6).toFixed(2)}M`
              : balNum >= 1e3
              ? `${(balNum / 1e3).toFixed(2)}K`
              : balNum.toFixed(2)} NXT
          </div>
          {nxtUsd !== null
            ? <div className="text-[8px] tracking-wide" style={{ color: "#c084fc" }}>≈ ${nxtUsd.toFixed(4)}/NXT</div>
            : <div className="text-[8px] opacity-50 tracking-wide">HW FUND</div>}
        </div>
      </Link>

      {/* BTC Wallet — persistent pill in global nav */}
      <BtcWalletPill />

      {/* Settings */}
      <Link href="/settings">
        <button
          data-testid="button-settings"
          title="Account Settings"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition-all"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </Link>

      {/* Logout */}
      <button
        data-testid="button-logout"
        onClick={() => logout()}
        title="Log out"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Log out</span>
      </button>
    </div>
  );
}

// ── Feed Item Card ─────────────────────────────────────────────────────
function FeedCard({ item }: { item: FeedItem }) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.message;
  const { Icon, color, bg, label } = cfg;
  const isUnread = item.type === "message" && !(item.meta as any).isRead;
  const isLive   = item.type === "stream"  && (item.meta as any).status === "live";

  return (
    <Link href={item.href}>
      <div
        data-testid={`feed-card-${item.id}`}
        className="group relative flex gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: `hsl(222 47% 8%)`,
          border: `1px solid ${isUnread || isLive ? color + "60" : "rgba(255,255,255,0.06)"}`,
        }}
      >
        {/* Type icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: bg }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-white text-sm font-medium truncate">{item.title}</span>
            {isLive && (
              <span className="flex items-center gap-1 text-xs font-bold animate-pulse"
                style={{ color: "#f472b6" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" />
                LIVE
              </span>
            )}
            {isUnread && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            )}
          </div>
          <p className="text-white/50 text-xs truncate">{item.preview}</p>

          {/* Stream viewer count */}
          {item.type === "stream" && (item.meta as any).viewerCount != null && (
            <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
              <Eye className="w-3 h-3" /> {(item.meta as any).viewerCount} viewers
            </div>
          )}

          {/* Transaction direction */}
          {item.type === "transaction" && (
            <div className="flex items-center gap-1 mt-1 text-xs"
              style={{ color: (item.meta as any).isSend ? "#f87171" : "#34d399" }}>
              {(item.meta as any).isSend ? "↑ Sent" : "↓ Received"} · fee {(item.meta as any).fee} NXT
            </div>
          )}

          {/* Spectral hash badge */}
          {(item.meta as any).spectralHash && (
            <div className="mt-1 text-xs font-mono text-white/30 truncate">
              Ψ {String((item.meta as any).spectralHash).substring(0, 16)}…
            </div>
          )}
        </div>

        {/* Type badge + time */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ background: bg, color }}>
            {label}
          </span>
          <span className="text-xs text-white/30 flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {relTime(item.createdAt)}
          </span>
        </div>

        {/* Hover arrow */}
        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 absolute right-3 top-1/2 -translate-y-1/2 transition-colors" />
      </div>
    </Link>
  );
}

// ── Physics fee data shape ─────────────────────────────────────────────
interface PhysicsProfile {
  channel: { wdm: number; nm: number; band: string; psi: string; energyJ: string };
  fees: Record<string, { feeNxt: string; multiplier: number; band: string }>;
  authority: Record<string, boolean>;
}

// ── Quick Actions ──────────────────────────────────────────────────────
function QuickActions() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: physicsData } = useQuery<PhysicsProfile>({
    queryKey: ["/api/physics/my"],
    staleTime: 60_000,
  });

  const actions = [
    { label: "Compose",    Icon: MessageSquarePlus, href: "/inbox",               color: "#22d3ee", feeKey: "message_send" },
    { label: "Go Live",    Icon: MonitorPlay,       href: "/streaming",            color: "#f472b6", feeKey: "stream_start" },
    { label: "Wallet",     Icon: Wallet,            href: "/wallet",               color: "#fbbf24", feeKey: null },
    { label: "My Profile", Icon: User,              href: `/profile/${user?.username ?? ""}`, color: "#a78bfa", feeKey: null },
    { label: "Directory",  Icon: Users,             href: "/directory",            color: "#67e8f9", feeKey: null },
    { label: "Encode",     Icon: Atom,              href: "/encoding-lab",         color: "#34d399", feeKey: null },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map(({ label, Icon, href, color, feeKey }) => {
        const fee = feeKey && physicsData?.fees?.[feeKey];
        const rgba = color === "#22d3ee" ? "34,211,238"
          : color === "#f472b6" ? "244,114,182"
          : color === "#34d399" ? "52,211,153"
          : "167,139,250";
        return (
          <button
            key={label}
            data-testid={`quick-action-${label.toLowerCase().replace(" ", "-")}`}
            onClick={() => navigate(href)}
            className="flex flex-col items-start px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] border gap-0.5"
            style={{ background: `rgba(${rgba},0.10)`, color, borderColor: `${color}35` }}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
            </div>
            {fee && (
              <span className="text-[10px] font-mono opacity-60">
                {fee.feeNxt} NXT · {fee.band}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Constitution live card ─────────────────────────────────────────────
function ConstitutionCard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/constitution/status"],
    refetchInterval: 30_000,
  });

  const con = data?.constitution;
  const a0001 = con?.articles["C-0001"];
  const a0002 = con?.articles["C-0002"];
  const a0005 = con?.articles["C-0005"];

  const allCompliant =
    a0001?.status === "COMPLIANT" &&
    a0002?.status === "COMPLIANT" &&
    a0005?.status === "COMPLIANT";

  const overallColor = isLoading ? "#6b7280" : allCompliant ? "#8b5cf6" : "#ef4444";

  const articles = [
    { id: "C-0001", label: "Non-Dominance",     short: "≤33% Λ mass",         status: a0001?.status },
    { id: "C-0002", label: "Immutable Rights",  short: "BHLS 1,150 NXT floor", status: a0002?.status },
    { id: "C-0005", label: "Physics Supremacy", short: "Maxwell-valid params",  status: a0005?.status },
  ];

  return (
    <Link href="/constitution">
      <div
        className="rounded-xl border p-4 cursor-pointer hover:scale-[1.005] transition-all"
        style={{ borderColor: `${overallColor}45`, background: `linear-gradient(135deg,${overallColor}0d,${overallColor}05)` }}
        data-testid="card-constitution-hub"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${overallColor}18` }}>
              <Shield className="w-4 h-4" style={{ color: overallColor }} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-white">Constitutional Enforcement</div>
              <div className="text-[10px] text-white/30 font-mono mt-0.5">
                {isLoading
                  ? "Checking…"
                  : allCompliant
                  ? "All three articles compliant"
                  : "Violation detected — transfer blocked"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isLoading && articles.map(a => (
              <div key={a.id}
                className="flex items-center gap-1 px-1.5 py-1 rounded border"
                style={{
                  borderColor: a.status === "COMPLIANT" ? "#22c55e30" : "#ef444430",
                  background:  a.status === "COMPLIANT" ? "#22c55e08" : "#ef444412",
                }}>
                {a.status === "COMPLIANT"
                  ? <CheckCircle2 size={8} className="text-green-400" />
                  : <AlertTriangle size={8} className="text-red-400" />
                }
                <span className="text-[9px] font-mono hidden sm:inline"
                  style={{ color: a.status === "COMPLIANT" ? "#86efac" : "#fca5a5" }}>
                  {a.id}
                </span>
              </div>
            ))}
            <ArrowRight className="w-3 h-3 text-white/20 ml-1" />
          </div>
        </div>

        <div className="hidden sm:grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
          {articles.map(a => (
            <div key={a.id} className="flex items-center gap-1.5">
              <div className="w-0.5 h-5 rounded-full flex-shrink-0"
                style={{ background: a.status === "COMPLIANT" ? "#22c55e" : a.status === "VIOLATED" ? "#ef4444" : "#6b7280" }} />
              <div>
                <div className="text-[10px] font-medium text-white/50">{a.label}</div>
                <div className="text-[9px] font-mono text-white/20">{a.short}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

function NavDropdowns() {
  const [open, setOpen] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const barRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={barRef} className="relative">
      {/* Section title bar */}
      <div
        className="flex flex-wrap gap-1 px-2 py-2 rounded-xl"
        style={{ background: "hsl(222 47% 8%)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {APP_SECTIONS.map((section) => {
          const isOpen = open === section.label;
          return (
            <button
              key={section.label}
              data-testid={`nav-section-${section.label.toLowerCase().replace(/\s+/g, "-")}`}
              onMouseEnter={() => setOpen(section.label)}
              onClick={() => setOpen(isOpen ? null : section.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-all"
              style={{
                color: isOpen ? section.accent : `${section.accent}80`,
                background: isOpen ? `${section.accent}15` : "transparent",
                border: `1px solid ${isOpen ? section.accent + "40" : "transparent"}`,
              }}
            >
              {section.label}
              <ChevronRight
                className="w-3 h-3 transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
              />
            </button>
          );
        })}
      </div>

      {/* Dropdown panel */}
      {open && (() => {
        const section = APP_SECTIONS.find(s => s.label === open);
        if (!section) return null;
        return (
          <div
            className="absolute left-0 right-0 z-50 mt-1 rounded-xl p-3 shadow-2xl"
            style={{
              background: "hsl(222 47% 7%)",
              border: `1px solid ${section.accent}35`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${section.accent}20`,
            }}
            onMouseLeave={() => setOpen(null)}
          >
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2 px-1"
              style={{ color: section.accent }}>
              {section.label}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-0.5">
              {section.items.map(({ title, href, Icon }) => (
                <Link key={href} href={href}>
                  <div
                    onClick={() => setOpen(null)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white transition-all cursor-pointer group"
                    style={{ ["--hover-bg" as any]: `${section.accent}12` }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${section.accent}15`)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    data-testid={`nav-link-${href.replace(/\//g, "-")}`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: section.accent }} />
                    <span className="truncate text-xs">{title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────
function EmptyFeed({ filter }: { filter: FeedType }) {
  const messages: Record<FeedType, string> = {
    all:         "No activity yet — compose a message, start a stream, or upload a file.",
    message:     "No messages yet — head to your inbox to start a conversation.",
    stream:      "No streams yet — start broadcasting on an open spectrum channel.",
    document:    "No documents yet — create a secure spectral document.",
    upload:      "No uploads yet — share a file over the P2P mesh.",
    transaction: "No transactions yet — open your wallet to send NXT.",
  };
  return (
    <div className="text-center py-16 text-white/30">
      <Rss className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{messages[filter]}</p>
    </div>
  );
}

// ── Campaign promo videos ──────────────────────────────────────────────
const CAMPAIGN_VIDEOS = [
  {
    id: "Mi9ix3AOr-k",
    title: "Assigning electromagnetic coordinates to alphabets opens doors to new technologies",
    label: "CE Encoding — How it works",
    tag: "Ad",
  },
];

function CampaignVideos() {
  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: "hsl(222 47% 7%)", border: "1px solid rgba(34,211,238,0.15)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
           style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2">
          <MonitorPlay className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            NexusOS Campaign
          </span>
        </div>
        <Link href="/campaign">
          <span className="text-[11px] font-mono text-cyan-400/70 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer">
            Back the campaign <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Videos */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {CAMPAIGN_VIDEOS.map((v) => (
          <div key={v.id} className="space-y-2">
            {/* Responsive 16:9 embed */}
            <div className="relative w-full rounded-xl overflow-hidden"
                 style={{ paddingBottom: "56.25%", background: "#050a14" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${v.id}?rel=0&modestbranding=1`}
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {/* Meta */}
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee" }}>
                {v.tag}
              </span>
              <div>
                <p className="text-xs text-white/70 leading-snug">{v.title}</p>
                <p className="text-[10px] text-white/30 mt-0.5 font-mono">{v.label}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Placeholder for next video */}
        <div className="rounded-xl flex flex-col items-center justify-center gap-2 py-8"
             style={{ border: "1px dashed rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)" }}>
          <MonitorPlay className="w-6 h-6 text-white/15" />
          <p className="text-[11px] text-white/20 text-center font-mono">More videos coming soon</p>
        </div>
      </div>
    </div>
  );
}

// ── Canonical Address Panel ────────────────────────────────────────────
function CanonicalAddressPanel({ username }: { username: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<any[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const { data: canonical, isLoading } = useQuery({
    queryKey: ["/api/spectral/my-canonical"],
    refetchInterval: 60_000,
  });

  const c = canonical as any;
  const sp = c?.spectral;
  const color = sp ? (() => {
    const band = sp.band as string;
    if (band === "SYSTEM") return "#8b00ff";
    if (band === "KERNEL") return "#2563eb";
    if (band === "USER")   return "#16a34a";
    return "#d97706";
  })() : "#22d3ee";

  const registerMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/spectral/register-canonical", {}),
    onSuccess: async (res: any) => {
      const d = await res.json();
      toast({ title: d.action === "created" ? "Canonical address registered!" : "Address refreshed", description: `WavelengthScript stored in spectral database at ${sp?.psi}` });
      qc.invalidateQueries({ queryKey: ["/api/spectral/my-canonical"] });
    },
    onError: () => toast({ title: "Registration failed", variant: "destructive" }),
  });

  async function runLookup() {
    const q = lookupQuery.trim();
    if (!q) return;
    setLookupLoading(true);
    setLookupResults(null);
    try {
      const r = await fetch(`/api/spectral/channel-lookup?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setLookupResults(d.results ?? []);
    } catch { setLookupResults([]); }
    setLookupLoading(false);
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: `Copied ${label}`, description: text.length > 60 ? text.slice(0, 57) + "…" : text })
    );
  }

  if (isLoading) return null;

  return (
    <div
      data-testid="canonical-address-panel"
      style={{ borderBottom: `1px solid ${color}22`, background: "hsl(222 47% 5.5%)" }}
      className="w-full"
    >
      {/* Collapsed strip */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-6 py-2 hover:bg-white/[0.02] transition-colors text-left"
        data-testid="button-canonical-expand"
      >
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
          <span className="text-[10px] uppercase tracking-widest font-mono" style={{ color }}>
            Canonical
          </span>
        </div>

        {sp ? (
          <>
            <span className="font-mono text-xs truncate flex-1" style={{ color }}>
              {sp.uri}
            </span>
            <span className="text-[10px] font-mono text-white/30 hidden sm:block flex-shrink-0">
              {sp.nm.toFixed(1)}nm · {(sp.freqTHz / 1000).toFixed(2)}PHz
            </span>
            {c.registered ? (
              <span className="flex items-center gap-1 text-[10px] text-green-400 flex-shrink-0">
                <CheckCircle2 className="w-3 h-3" /> On-chain
              </span>
            ) : (
              <span className="text-[10px] text-yellow-500 flex-shrink-0">Unregistered</span>
            )}
          </>
        ) : (
          <span className="text-xs text-white/30 flex-1 font-mono">Computing spectral address…</span>
        )}

        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/30 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
      </button>

      {/* Expanded panel */}
      {expanded && sp && (
        <div className="px-6 pb-5 pt-1 space-y-4">
          {/* Two-column: physics grid + WLS code */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Physics params */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono">Spectral Parameters</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Ψ channel",  value: sp.psi },
                  { label: "Band",       value: sp.band },
                  { label: "λ (nm)",     value: `${sp.nm.toFixed(3)} nm` },
                  { label: "f (THz)",    value: `${(sp.freqTHz).toFixed(2)} THz` },
                  { label: "E (J)",      value: sp.energyJ.toExponential(3) },
                  { label: "Λ (kg)",     value: sp.massKg.toExponential(3) },
                  { label: "WDM slot",   value: String(sp.wdm) },
                  { label: "OAM mode",   value: String(sp.oam) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded p-2" style={{ background: `${color}0d`, border: `1px solid ${color}22` }}>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-mono font-semibold mt-0.5" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* URI row with copy */}
              <div className="flex items-center gap-2 rounded px-3 py-2" style={{ background: `${color}0d`, border: `1px solid ${color}22` }}>
                <span className="font-mono text-xs truncate flex-1" style={{ color }}>{sp.uri}</span>
                <button onClick={() => copyText(sp.uri, "WNSP URI")} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a href={`/wnsp-bridge?uri=${encodeURIComponent(sp.uri)}`} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Register button */}
              <div className="flex items-center gap-2">
                <Button
                  data-testid="button-register-canonical"
                  size="sm"
                  onClick={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending}
                  className="flex-1 h-8 text-xs font-mono"
                  style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${registerMutation.isPending ? "animate-spin" : ""}`} />
                  {registerMutation.isPending ? "Registering…" : c.registered ? "Refresh in spectral DB" : "Register canonical address"}
                </Button>
                {c.registered && (
                  <span className="text-[10px] text-green-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {c.spectral.resolveCount} lookups
                  </span>
                )}
              </div>
            </div>

            {/* WavelengthScript code block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono">WavelengthScript Declaration</p>
                <button
                  onClick={() => copyText(c.wavelengthScript, "WLS code")}
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white transition-colors font-mono"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre
                data-testid="text-wls-code"
                className="rounded-lg p-3 text-[10px] font-mono leading-relaxed overflow-x-auto"
                style={{ background: "#010510", border: `1px solid ${color}22`, color: "#94a3b8" }}
              >
                {c.wavelengthScript.split("\n").map((line: string, i: number) => {
                  if (line.startsWith("//")) return <span key={i} style={{ color: "#475569" }}>{line}{"\n"}</span>;
                  if (line.startsWith("@") && line.includes("declare")) return <span key={i} style={{ color }}>{line}{"\n"}</span>;
                  if (line.startsWith("@emit")) return <span key={i} style={{ color: "#7c3aed" }}>{line}{"\n"}</span>;
                  if (line.startsWith("  label") || line.startsWith("  psi") || line.startsWith("  uri")) return <span key={i}><span style={{ color: "#60a5fa" }}>{line.split(":=")[0]}</span><span style={{ color: "#94a3b8" }}>:={line.split(":=")[1]}{"\n"}</span></span>;
                  if (line === "}") return <span key={i} style={{ color }}>{line}{"\n"}</span>;
                  if (line.includes("broadcast")) return <span key={i} style={{ color: "#f59e0b" }}>{line}{"\n"}</span>;
                  return <span key={i}>{line}{"\n"}</span>;
                })}
              </pre>
              <div className="flex gap-2">
                <Link href="/wavelength-lang">
                  <button className="text-[10px] text-white/30 hover:text-cyan-400 font-mono transition-colors">WavelengthScript spec →</button>
                </Link>
                <Link href="/wnsp-bridge">
                  <button className="text-[10px] text-white/30 hover:text-cyan-400 font-mono transition-colors ml-3">WNSP Bridge →</button>
                </Link>
              </div>
            </div>
          </div>

          {/* Channel Lookup */}
          <div className="space-y-2" style={{ borderTop: `1px solid ${color}15`, paddingTop: "1rem" }}>
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono">Channel Lookup — Query any Ψ channel</p>
            <div className="flex gap-2">
              <Input
                data-testid="input-channel-lookup"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runLookup()}
                placeholder="Ψ(84,23,H) · wnsp://… · or label"
                className="flex-1 h-8 text-xs font-mono bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-cyan-500/40"
              />
              <Button
                data-testid="button-channel-lookup"
                size="sm"
                onClick={runLookup}
                disabled={lookupLoading || !lookupQuery.trim()}
                className="h-8 px-3 text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-white"
              >
                {lookupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {lookupResults !== null && (
              lookupResults.length === 0 ? (
                <p className="text-xs text-white/30 font-mono">No channels found for "{lookupQuery}"</p>
              ) : (
                <div className="space-y-1.5">
                  {lookupResults.map((r: any, i: number) => (
                    <div key={i} data-testid={`lookup-result-${i}`}
                      className="rounded p-2.5 flex items-start gap-2.5"
                      style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold" style={{ color }}>{r.psiChannel}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                            style={{ background: `${color}20`, color }}>{r.band}</span>
                          {r.isCanonical && <span className="text-[9px] text-green-400 font-mono">canonical</span>}
                          <span className="text-[9px] text-white/30 font-mono">{r.resourceType}</span>
                        </div>
                        <p className="font-mono text-[10px] text-white/50 truncate">{r.wnspUri}</p>
                        {r.httpUrl && (
                          <a href={r.httpUrl} className="text-[10px] text-cyan-500 hover:underline font-mono">
                            {r.httpUrl}
                          </a>
                        )}
                        <p className="text-[10px] text-white/30">{r.description}</p>
                        <p className="text-[9px] text-white/20 font-mono">{parseFloat(r.wavelengthNm).toFixed(2)}nm · {r.resolveCount} lookups</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => copyText(r.wnspUri, "URI")} className="text-white/20 hover:text-white transition-colors">
                          <Copy className="w-3 h-3" />
                        </button>
                        <button onClick={() => { setLookupQuery(""); setExpanded(true); copyText(r.wavelengthScript, "WLS"); toast({ title: "WLS copied!", description: r.psiChannel }); }} className="text-white/20 hover:text-cyan-400 transition-colors" title="Copy WavelengthScript">
                          <Code2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Hub Page ──────────────────────────────────────────────────────
export default function HubPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FeedType>("all");

  const { data: walletData } = useQuery<{ wallet: { address: string; balance: string } }>({
    queryKey: ["/api/wallet"],
    refetchInterval: 30_000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 15_000,
  });

  const { data: feedData, isLoading } = useQuery<{ feed: FeedItem[]; total: number }>({
    queryKey: ["/api/feed"],
    refetchInterval: 20_000,
  });

  const { data: profileData } = useQuery<{ profile: { avatarUrl: string | null; bio: string | null; country: string | null; stateRegion: string | null } }>({
    queryKey: ["/api/settings/profile"],
  });

  if (!user) return null;

  const allItems: FeedItem[] = feedData?.feed ?? [];
  const filtered = filter === "all"
    ? allItems
    : allItems.filter((i) => i.type === filter);

  const TAB_COUNTS: Record<FeedType, number> = {
    all:         allItems.length,
    message:     allItems.filter(i => i.type === "message").length,
    stream:      allItems.filter(i => i.type === "stream").length,
    document:    allItems.filter(i => i.type === "document").length,
    upload:      allItems.filter(i => i.type === "upload").length,
    transaction: allItems.filter(i => i.type === "transaction").length,
  };

  const TABS: { value: FeedType; label: string; Icon: typeof Mail }[] = [
    { value: "all",         label: "All",          Icon: Rss },
    { value: "message",     label: "Messages",      Icon: Mail },
    { value: "stream",      label: "Streams",       Icon: Radio },
    { value: "document",    label: "Documents",     Icon: FileText },
    { value: "upload",      label: "Files",         Icon: Upload },
    { value: "transaction", label: "Transactions",  Icon: ArrowRightLeft },
  ];

  return (
    <div className="min-h-screen" style={{ background: "hsl(222 47% 5%)", color: "white" }}>
      <WelcomeModal username={user.username ?? ""} />
      {/* Identity Rail */}
      <IdentityRail
        user={user as any}
        wallet={walletData?.wallet}
        unread={unreadData?.count ?? 0}
        avatarUrl={profileData?.profile?.avatarUrl ?? null}
      />

      {/* Canonical Address Panel — WNSP address linked in WavelengthScript + spectral DB */}
      <CanonicalAddressPanel username={user.username} />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">NexusOS Hub</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Your unified activity feed — messages, streams, documents, files, transactions.
          </p>
        </div>

        {/* Constitution live card */}
        <ConstitutionCard />

        {/* Campaign promo videos */}
        <CampaignVideos />

        {/* Telegram video feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-white/30">Latest Videos</p>
            <Link href="/videos">
              <span className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer font-mono">View all →</span>
            </Link>
          </div>
          <TelegramVideoGallery compact maxVideos={3} showLink accentColor="#3b82f6" />
        </div>

        {/* Quick actions */}
        <QuickActions />

        {/* Nav Dropdowns */}
        <NavDropdowns />

        {/* Feed */}
        <div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FeedType)}>
            <TabsList className="flex flex-wrap gap-1 h-auto p-1 mb-4"
              style={{ background: "hsl(222 47% 8%)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {TABS.map(({ value, label, Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  data-testid={`feed-tab-${value}`}
                  className="flex items-center gap-1.5 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {TAB_COUNTS[value] > 0 && (
                    <span className="text-[10px] px-1 rounded-full"
                      style={{ background: "rgba(255,255,255,0.1)" }}>
                      {TAB_COUNTS[value]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse"
                  style={{ background: "hsl(222 47% 8%)" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyFeed filter={filter} />
          ) : (
            <div className="space-y-2">
              {filtered.map(item => <FeedCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
