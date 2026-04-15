import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Radio, FileText, Upload, ArrowRightLeft,
  Activity, Layers, Cpu, Code2, Wallet, Globe2,
  Zap, Atom, Waves, Rocket, Users, Database,
  Shield, BookOpen, HardDrive, GitBranch,
  ChevronRight, LayoutGrid, Rss, Eye, Clock,
  MessageSquarePlus, MonitorPlay, FilePlus, Sparkles, Key, Scale, LogOut, Settings, User,
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
      { title: "K1 Platform",   href: "/k1",             Icon: Rocket },
      { title: "Kernel",        href: "/kernel",          Icon: Cpu },
      { title: "WNSP Coord.",   href: "/wnsp/coordinator",Icon: Globe2 },
      { title: "Governance",    href: "/governance",       Icon: Scale },
      { title: "Settings",      href: "/settings",        Icon: Settings },
    ],
  },
  {
    label: "Developer",
    accent: "#16a34a",
    items: [
      { title: "API Keys",      href: "/developer/keys",  Icon: Key },
      { title: "GitHub Bridge", href: "/github",          Icon: GitBranch },
      { title: "CE Writer",     href: "/ce-writer",       Icon: Code2 },
      { title: "Spectral Lib.", href: "/spectral-library",Icon: BookOpen },
      { title: "Analytics",     href: "/workspace/analytics", Icon: Activity },
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

      {/* Balance */}
      <Link href="/wallet">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer text-xs font-mono"
          style={{ background: "rgba(251,191,36,0.10)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
          <Wallet className="w-3.5 h-3.5" />
          {balNum >= 1e6
            ? `${(balNum / 1e6).toFixed(2)}M`
            : balNum >= 1e3
            ? `${(balNum / 1e3).toFixed(2)}K`
            : balNum.toFixed(4)} NXT
        </div>
      </Link>

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

// ── App Grid (compact nav) ─────────────────────────────────────────────
function AppGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
      {APP_SECTIONS.map((section) => (
        <div key={section.label}
          className="rounded-xl p-4"
          style={{ background: "hsl(222 47% 8%)", border: `1px solid ${section.accent}25` }}>
          <p className="text-xs font-bold mb-3 tracking-widest uppercase"
            style={{ color: section.accent }}>
            {section.label}
          </p>
          <div className="space-y-1">
            {section.items.map(({ title, href, Icon }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer group">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: section.accent }} />
                  <span className="truncate">{title}</span>
                  <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
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

// ── Main Hub Page ──────────────────────────────────────────────────────
export default function HubPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FeedType>("all");
  const [showGrid, setShowGrid] = useState(false);

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
      {/* Identity Rail */}
      <IdentityRail
        user={user as any}
        wallet={walletData?.wallet}
        unread={unreadData?.count ?? 0}
        avatarUrl={profileData?.profile?.avatarUrl ?? null}
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">NexusOS Hub</h1>
            <p className="text-sm text-white/40 mt-0.5">
              Your unified activity feed — messages, streams, documents, files, transactions.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white border border-white/10 gap-2"
            onClick={() => setShowGrid(v => !v)}
            data-testid="toggle-app-grid"
          >
            <LayoutGrid className="w-4 h-4" />
            {showGrid ? "Hide" : "All apps"}
          </Button>
        </div>

        {/* Quick actions */}
        <QuickActions />

        {/* App Grid (collapsible) */}
        {showGrid && (
          <div>
            <p className="text-xs uppercase tracking-widest text-white/30 mb-3">Navigate</p>
            <AppGrid />
          </div>
        )}

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
