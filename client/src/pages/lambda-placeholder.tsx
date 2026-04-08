import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Shield, Wallet, Radio, Zap, Users, FlaskConical, Activity, Waves,
  Rocket, Presentation, Atom, Mail, Database, Code2, BookOpen,
  DollarSign, Layers, GitBranch, HardDrive, LogOut, ChevronRight,
  Cpu, Globe2, Lock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// ── Spectral band accent colours ────────────────────────────────────
const VIOLET = "#8b00ff";
const BLUE   = "#2563eb";
const CYAN   = "#06b6d4";
const GREEN  = "#16a34a";
const YELLOW = "#ca8a04";
const ORANGE = "#ea580c";
const RED    = "#dc2626";

// ── Section definitions ──────────────────────────────────────────────
const SECTIONS = [
  {
    label: "Command & Control",
    subtitle: "All systems from one place — encode, stream, route, store, transact",
    accent: VIOLET,
    items: [
      { title: "Nexus Command",         description: "Unified mission control — operate every system from one page", href: "/nexus-command",         icon: Activity },
      { title: "Message Encoder",       description: "Turn any text into a wavelength of light — encode, decode, send", href: "/encoding-lab",      icon: Atom     },
      { title: "Spectral Live Streams", description: "Broadcast on open spectrum — no platform, no ban button",     href: "/streaming",             icon: Radio    },
      { title: "P2P Transmission",      description: "Share files peer-to-peer — encrypted by wavelength, no middleman", href: "/transmission",    icon: Waves    },
    ],
  },
  {
    label: "Open Ledger & Data",
    subtitle: "Blockchain · Spectral DB · Agent Bus — all trustless, all physics",
    accent: BLUE,
    items: [
      { title: "Wavelength Blockchain", description: "Every block is a photonic transaction — energy cost set by physics not policy", href: "/blockchain", icon: Layers },
      { title: "Spectral Database",     description: "Store data at its natural wavelength address — retrieve by physics not credentials", href: "/spectral-db", icon: Database },
      { title: "Agent Message Bus",     description: "Route messages across authority bands — intelligent physics-based delivery", href: "/agent-bus", icon: Radio },
      { title: "Kernel",                description: "5-phase boot OS — root of all spectral authority", href: "/kernel",                icon: Cpu      },
    ],
  },
  {
    label: "Build on Light",
    subtitle: "Replace binary — every instruction is a frequency of light",
    accent: GREEN,
    items: [
      { title: "Photonic Dev",          description: "Code editor where instructions are wavelengths, not binary 0s and 1s", href: "/photonic-dev", icon: Layers },
      { title: "CE Code Writer",        description: "Describe what you want — get working code at its spectral address",   href: "/ce-writer",    icon: Code2  },
      { title: "WNSP Coordinator",      description: "25,600 orthogonal channels for collision-free communication",         href: "/wnsp/coordinator", icon: Globe2 },
      { title: "Nexus v10",             description: "Latest physics protocol interface",                                    href: "/v10",           icon: Zap    },
    ],
  },
  {
    label: "Energy & Planet",
    subtitle: "K1 Orchestration · Resonance · Planetary-scale infrastructure",
    accent: YELLOW,
    items: [
      { title: "K1 Infrastructure",     description: "Energy roadmap from lab to civilisation scale",          href: "/k1",                    icon: Rocket   },
      { title: "K1 Orchestration",      description: "Runtime coordination of planetary energy sources",       href: "/k1/orchestration",      icon: Activity },
      { title: "Hardware OS",           description: "Photonic hardware stack — resonators to kernel",         href: "/nexus-hardware-os",     icon: HardDrive},
      { title: "Quantum Threshold",     description: "Where silicon ends and light computing begins",          href: "/quantum-threshold",     icon: GitBranch},
    ],
  },
  {
    label: "Identity & Wallet",
    subtitle: "NXT tokens · Secure docs · Community — no surveillance",
    accent: ORANGE,
    items: [
      { title: "NXT Wallet",            description: "Send and receive NXT — fees computed from E=hf not corporate policy", href: "/wallet",   icon: Wallet   },
      { title: "Secure Documents",      description: "Documents signed by wavelength — unforgeable without physics",         href: "/secure-docs", icon: Shield },
      { title: "Friends & Community",   description: "Connect with people on open spectrum — no algorithm curates your feed", href: "/friends", icon: Users    },
      { title: "Inbox",                 description: "Messages encoded into light — private by the laws of physics",         href: "/inbox",   icon: Mail     },
    ],
  },
  {
    label: "Research & Manifesto",
    subtitle: "The case for replacing binary computing — theory, evidence, roadmap",
    accent: RED,
    items: [
      { title: "Why Light Not Binary",  description: "Post-silicon manifesto — the case for wavelength computing", href: "/wavelength-os",       icon: BookOpen },
      { title: "Beyond Silicon",        description: "Five post-silicon computing paradigms ready today",          href: "/computing-alternatives", icon: Cpu   },
      { title: "Research",              description: "Lambda Boson theory — Λ = hf/c² foundation physics",        href: "/workspace/research",  icon: FlaskConical },
      { title: "Developer Matrix",      description: "Open SDK & integration docs — build on NexusOS",            href: "/developer-matrix",    icon: Code2  },
    ],
  },
];

// ── Live Nexus Status strip ──────────────────────────────────────────
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
    {
      label: "Blockchain",
      href:  "/blockchain",
      value: `Block #${chainHeight}`,
      sub:   latestBlock ? latestBlock.psiChannel : "genesis",
      color: "#2563eb",
      live:  chainHeight > 0,
    },
    {
      label: "Agent Bus",
      href:  "/agent-bus",
      value: `${busQueued} queued`,
      sub:   `${busDelivered} delivered`,
      color: "#8b00ff",
      live:  true,
      pulse: busQueued > 0,
    },
    {
      label: "Spectral DB",
      href:  "/spectral-db",
      value: `${dbCount} records`,
      sub:   "25,600 channels",
      color: "#16a34a",
      live:  dbCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-8">
      {items.map(item => (
        <Link key={item.label} href={item.href}>
          <div className="group rounded-xl border p-3 cursor-pointer transition-all hover:scale-[1.02]"
            style={{ borderColor: `${item.color}40`, background: `${item.color}08` }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${(item as any).pulse ? "animate-ping" : "animate-pulse"}`}
                style={{ background: item.color }} />
              <span className="text-xs font-mono font-semibold" style={{ color: item.color }}>
                {item.label}
              </span>
            </div>
            <div className="text-sm font-mono text-slate-200">{item.value}</div>
            <div className="text-xs font-mono text-slate-600">{item.sub}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Spectrum bar component ───────────────────────────────────────────
function SpectrumBar() {
  return (
    <div className="w-full h-1 rounded-full"
      style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />
  );
}

// ── Individual item card ─────────────────────────────────────────────
function ItemCard({ item, accent }: { item: typeof SECTIONS[0]["items"][0]; accent: string }) {
  return (
    <Link href={item.href}>
      <div className="group flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/40
                      hover:border-slate-600 hover:bg-slate-800/60 transition-all cursor-pointer"
        data-testid={`card-feature-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <item.icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
            {item.title}
          </div>
          <div className="text-xs text-slate-500 truncate">{item.description}</div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
      </div>
    </Link>
  );
}

// ── Section block ────────────────────────────────────────────────────
function Section({ section }: { section: typeof SECTIONS[0] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: section.accent, boxShadow: `0 0 6px ${section.accent}` }} />
        <div>
          <span className="text-sm font-bold text-slate-200">{section.label}</span>
          <span className="text-xs text-slate-600 ml-2 hidden md:inline">{section.subtitle}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {section.items.map(item => (
          <ItemCard key={item.href} item={item} accent={section.accent} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function LambdaPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <div className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-light text-white tracking-widest">Λ</span>
            <span className="text-sm font-semibold text-slate-300">NexusOS</span>
            <span className="text-xs text-slate-600 hidden sm:block">· Wavelength Network Signaling Protocol</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-slate-500 hidden sm:block" data-testid="text-user-phone">
                {user.username ?? user.phone}
              </span>
            )}
            <button onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
              data-testid="btn-logout">
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-7xl font-thin text-white tracking-[0.3em] mb-3 select-none"
            data-testid="text-lambda" style={{ fontFamily: "serif" }}>
            Λ
          </div>
          <h1 className="text-2xl font-bold text-white mb-1" data-testid="text-title">
            NexusOS
          </h1>
          <p className="text-slate-400 text-sm mb-1" data-testid="text-subtitle">
            Encode messages into light · Stream without platforms · Build without binary · Transact without banks
          </p>
          <p className="text-slate-600 text-xs font-mono">
            Open source · Trustless · AGPL-3.0 · Physics-based · Λ = hf/c²
          </p>
          <div className="mt-4 mx-auto max-w-md">
            <SpectrumBar />
          </div>
        </div>

        {/* Live Nexus Status */}
        <NexusStatus />

        {/* Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {SECTIONS.map(section => (
            <Section key={section.label} section={section} />
          ))}
        </div>

        {/* Footer equation */}
        <div className="mt-12 pt-6 border-t border-slate-800/40 text-center space-y-1">
          <SpectrumBar />
          <p className="text-slate-700 text-xs font-mono mt-3">
            Physics-based blockchain · Lambda Boson cryptography · E = hf economics ·
            25,600 orthogonal Ψ channels · Kardashev Type I infrastructure
          </p>
        </div>
      </div>
    </div>
  );
}
