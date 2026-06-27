import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, Wallet, Radio, Zap, Users, FlaskConical, Activity, Waves,
  Rocket, Atom, Mail, Database, Code2, BookOpen,
  Layers, GitBranch, HardDrive, LogOut, ChevronRight,
  Cpu, Globe2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// ── Spectral band accent colours ─────────────────────────────────────
const VIOLET = "#8b00ff";
const BLUE   = "#2563eb";
const GREEN  = "#16a34a";
const YELLOW = "#d97706";
const ORANGE = "#ea580c";
const RED    = "#dc2626";

// ── Section / card definitions ────────────────────────────────────────
const SECTIONS = [
  {
    label:    "Command & Control",
    subtitle: "Encode · Stream · Route · Store · Transact",
    accent:   VIOLET,
    items: [
      { title: "Nexus Command",         desc: "Operate every system from one unified interface",              href: "/nexus-command",          icon: Activity,     live: false },
      { title: "Message Encoder",       desc: "Turn any text into a wavelength of light — encode or decode",  href: "/encoding-lab",           icon: Atom,         live: false },
      { title: "Spectral Live Streams", desc: "Broadcast on open spectrum — no platform, no ban button",      href: "/streaming",              icon: Radio,        live: true  },
      { title: "P2P Transmission",      desc: "Share files peer-to-peer — encrypted by wavelength",           href: "/transmission",           icon: Waves,        live: false },
    ],
  },
  {
    label:    "Open Ledger & Data",
    subtitle: "Blockchain · Spectral DB · Agent Bus",
    accent:   BLUE,
    items: [
      { title: "Wavelength Blockchain", desc: "Every block is a photonic transaction — fees set by E=hf",     href: "/blockchain",             icon: Layers,       live: true  },
      { title: "Spectral Database",     desc: "Store data at its natural wavelength address — trustless",      href: "/spectral-db",            icon: Database,     live: true  },
      { title: "Agent Message Bus",     desc: "Route messages across authority bands — physics-based delivery",href: "/agent-bus",              icon: Radio,        live: true  },
      { title: "Kernel",                desc: "6-phase boot OS — root of all spectral authority",              href: "/kernel",                 icon: Cpu,          live: true  },
    ],
  },
  {
    label:    "Build on Light",
    subtitle: "Replace binary — every instruction is a frequency of light",
    accent:   GREEN,
    items: [
      { title: "Photonic Dev",          desc: "Code editor where instructions are wavelengths, not binary",    href: "/photonic-dev",           icon: Layers,       live: false },
      { title: "CE Code Writer",        desc: "Describe what you want — code delivered at spectral address",   href: "/ce-writer",              icon: Code2,        live: false },
      { title: "WNSP Coordinator",      desc: "25,600 orthogonal Hilbert channels — collision-free routing",   href: "/wnsp/coordinator",       icon: Globe2,       live: true  },
      { title: "Nexus v10",             desc: "Latest WNSP protocol interface with live physics readouts",      href: "/v10",                    icon: Zap,          live: false },
    ],
  },
  {
    label:    "Energy & Planet",
    subtitle: "K1 Orchestration · Resonance · Civilisation-scale infrastructure",
    accent:   YELLOW,
    items: [
      { title: "K1 Infrastructure",     desc: "Energy roadmap from lab to Kardashev Type I scale",             href: "/k1",                     icon: Rocket,       live: false },
      { title: "K1 Orchestration",      desc: "Runtime coordination of planetary energy sources",               href: "/k1/orchestration",       icon: Activity,     live: true  },
      { title: "Hardware OS",           desc: "Photonic hardware stack — resonators to kernel",                 href: "/nexus-hardware-os",      icon: HardDrive,    live: false },
      { title: "Quantum Threshold",     desc: "Where silicon ends and light computing begins",                  href: "/quantum-threshold",      icon: GitBranch,    live: false },
    ],
  },
  {
    label:    "Identity & Wallet",
    subtitle: "NXT tokens · Secure docs · Community — no surveillance",
    accent:   ORANGE,
    items: [
      { title: "NXT Wallet",            desc: "Send and receive NXT — fees computed from E=hf, never from policy", href: "/wallet",              icon: Wallet,       live: true  },
      { title: "Secure Documents",      desc: "Documents signed by wavelength — unforgeable without physics",   href: "/secure-docs",            icon: Shield,       live: false },
      { title: "Friends & Community",   desc: "Connect on open spectrum — no algorithm curates your feed",      href: "/friends",                icon: Users,        live: false },
      { title: "Inbox",                 desc: "Messages encoded into light — private by the laws of physics",   href: "/inbox",                  icon: Mail,         live: true  },
    ],
  },
  {
    label:    "Research & Manifesto",
    subtitle: "The case for replacing binary computing — theory, evidence, roadmap",
    accent:   RED,
    items: [
      { title: "Why Light Not Binary",  desc: "Post-silicon manifesto — the case for wavelength computing",    href: "/wavelength-os",          icon: BookOpen,     live: false },
      { title: "Beyond Silicon",        desc: "Five post-silicon computing paradigms ready today",             href: "/computing-alternatives", icon: Cpu,          live: false },
      { title: "Research",              desc: "Einstein's Λ=hf/c² — first oscillation, compression states",   href: "/workspace/research",     icon: FlaskConical, live: false },
      { title: "Developer Matrix",      desc: "Open SDK & integration docs — build on NexusOS",               href: "/developer-matrix",       icon: Code2,        live: false },
    ],
  },
];

// ── Live status strip ─────────────────────────────────────────────────
function NexusStatus() {
  const { data: chainData } = useQuery<any>({ queryKey: ["/api/blockchain/chain"], refetchInterval: 8000 });
  const { data: busData }   = useQuery<any>({ queryKey: ["/api/agent-bus/status"],  refetchInterval: 6000 });
  const { data: dbData }    = useQuery<any>({ queryKey: ["/api/spectral-db/scan"],  refetchInterval: 10000 });

  const chainHeight  = (chainData?.blocks ?? []).length;
  const latestBlock  = (chainData?.blocks ?? []).at(-1);
  const busQueued    = busData?.queued ?? 0;
  const busDelivered = busData?.delivered ?? 0;
  const dbCount      = (dbData?.records ?? []).length;

  const items = [
    { label: "Blockchain",  href: "/blockchain",  value: `Block #${chainHeight}`, sub: latestBlock ? latestBlock.psiChannel : "genesis", color: BLUE,   pulse: false },
    { label: "Agent Bus",   href: "/agent-bus",   value: `${busQueued} queued`,   sub: `${busDelivered} delivered`,                       color: VIOLET, pulse: busQueued > 0 },
    { label: "Spectral DB", href: "/spectral-db", value: `${dbCount} records`,    sub: "25,600 Ψ channels",                                color: GREEN,  pulse: false },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-8">
      {items.map(item => (
        <Link key={item.label} href={item.href}>
          <div className="group rounded-xl border p-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ borderColor: `${item.color}35`, background: `${item.color}08` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.pulse ? "animate-ping" : "animate-pulse"}`}
                style={{ background: item.color }} />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: item.color }}>
                {item.label}
              </span>
            </div>
            <div className="text-sm font-mono text-slate-200 font-medium">{item.value}</div>
            <div className="text-[10px] font-mono text-slate-600 truncate">{item.sub}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Spectrum gradient bar ─────────────────────────────────────────────
function SpectrumBar({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full h-[2px] rounded-full ${className}`}
      style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />
  );
}

// ── Card ──────────────────────────────────────────────────────────────
type CardItem = typeof SECTIONS[0]["items"][0];

function ItemCard({ item, accent }: { item: CardItem; accent: string }) {
  return (
    <Link href={item.href}>
      <div
        className="group relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer
                   transition-all duration-200 hover:scale-[1.015] active:scale-[0.99]
                   overflow-hidden"
        style={{
          borderColor: `${accent}25`,
          background:  `linear-gradient(135deg, ${accent}06 0%, transparent 70%)`,
        }}
        data-testid={`card-feature-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {/* icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110"
          style={{ background: `${accent}16`, border: `1px solid ${accent}30` }}
        >
          <item.icon className="w-4.5 h-4.5" style={{ color: accent }} />
        </div>

        {/* text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors leading-tight">
              {item.title}
            </span>
            {item.live && (
              <span className="w-1 h-1 rounded-full animate-pulse flex-shrink-0" style={{ background: accent }} />
            )}
          </div>
          <div className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors leading-relaxed line-clamp-2">
            {item.desc}
          </div>
        </div>

        {/* arrow */}
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 mt-1 transition-transform group-hover:translate-x-0.5"
          style={{ color: `${accent}60` }} />

        {/* bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(to right, transparent, ${accent}50, transparent)` }} />
      </div>
    </Link>
  );
}

// ── Section ───────────────────────────────────────────────────────────
function Section({ section }: { section: typeof SECTIONS[0] }) {
  return (
    <div className="space-y-2">
      {/* section header */}
      <div className="flex items-center gap-2.5 mb-3 px-0.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: section.accent, boxShadow: `0 0 8px ${section.accent}80` }} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-slate-200">{section.label}</span>
          <span className="text-[11px] text-slate-600 ml-2 hidden sm:inline">{section.subtitle}</span>
        </div>
        {/* micro spectrum at right */}
        <div className="hidden md:block w-12 h-[2px] rounded-full flex-shrink-0"
          style={{ background: `linear-gradient(to right, ${section.accent}80, ${section.accent}20)` }} />
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {section.items.map(item => (
          <ItemCard key={item.href} item={item} accent={section.accent} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function LambdaPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Top bar ── */}
      <div className="border-b border-slate-800/50 bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-thin text-white" style={{ fontFamily: "serif" }}>Λ</span>
            <span className="text-sm font-bold text-slate-200 tracking-wide">NexusOS</span>
            <span className="text-[10px] text-slate-600 hidden sm:block font-mono ml-1">· WNSP</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-xs text-slate-500 hidden sm:block font-mono" data-testid="text-user-phone">
                {user.username ?? (user as any).phone}
              </span>
            )}
            <button onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
              data-testid="btn-logout">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Hero ── */}
        <div className="text-center mb-10">
          <div
            className="text-8xl font-thin text-white tracking-[0.25em] mb-4 select-none"
            data-testid="text-lambda"
            style={{
              fontFamily: "serif",
              textShadow: "0 0 60px rgba(139,0,255,0.3), 0 0 120px rgba(37,99,235,0.15)",
            }}
          >
            Λ
          </div>
          <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-title">NexusOS</h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed" data-testid="text-subtitle">
            Encode messages into light · Stream without platforms · Build without binary · Transact without banks
          </p>
          <p className="text-slate-600 text-xs font-mono mt-2">
            Λ = hf/c² · Einstein's first oscillation · Open source · AGPL-3.0
          </p>
          <div className="mt-5 mx-auto max-w-sm">
            <SpectrumBar />
          </div>
        </div>

        {/* ── Live status ── */}
        <NexusStatus />

        {/* ── Section grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {SECTIONS.map(section => (
            <Section key={section.label} section={section} />
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="mt-14 pt-6 border-t border-slate-800/40 text-center space-y-3">
          <SpectrumBar />
          <p className="text-slate-700 text-[11px] font-mono mt-3 leading-relaxed">
            Physics-based blockchain · Einstein's Λ=hf/c² · E=hf economics ·
            25,600 orthogonal Ψ channels · Kardashev Type I infrastructure
          </p>
          <p className="text-slate-800 text-[10px] font-mono">
            Spacetime = first unobserved wavefunction · Compression state addressing · WNSP-CE + WNSP-SE
          </p>
        </div>

      </div>
    </div>
  );
}
