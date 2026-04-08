import { Link } from "wouter";
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
    label: "Physics Layer",
    subtitle: "Λ = hf/c²  ·  The foundation everything else derives from",
    accent: VIOLET,
    items: [
      { title: "Encoding Lab",          description: "CE→SE lambda encoder",               href: "/encoding-lab",          icon: Atom     },
      { title: "Photonic Dev",          description: "Nexus development environment",      href: "/photonic-dev",          icon: Layers   },
      { title: "CE Code Writer",        description: "Describe → spectral address → code", href: "/ce-writer",             icon: Code2    },
      { title: "Spectral Database",     description: "Data stored at its wavelength",      href: "/spectral-db",           icon: Database },
      { title: "Wavelength Blockchain", description: "First photonic ledger — Ψ not hash",  href: "/blockchain",            icon: Layers   },
    ],
  },
  {
    label: "Kernel & Protocol",
    subtitle: "WNSP · Hilbert space channels · AI OS runtime",
    accent: BLUE,
    items: [
      { title: "Nexus v10",             description: "Latest protocol interface",          href: "/v10",                   icon: Zap      },
      { title: "WNSP Coordinator",      description: "Channel allocation & routing",       href: "/wnsp/coordinator",      icon: Globe2   },
      { title: "Kernel",                description: "5-phase boot · agent bus",           href: "/kernel",                icon: Cpu      },
      { title: "Wavefield",             description: "Quantum field simulation",           href: "/workspace/wavefield",   icon: Waves    },
    ],
  },
  {
    label: "Energy & Infrastructure",
    subtitle: "K1 Orchestration · Resonance harvesting · Planetary scale",
    accent: GREEN,
    items: [
      { title: "K1 Infrastructure",     description: "Civilisation energy roadmap",        href: "/k1",                    icon: Rocket   },
      { title: "K1 Orchestration",      description: "Runtime energy coordination",        href: "/k1/orchestration",      icon: Activity },
      { title: "Hardware OS",           description: "Nexus photonic hardware stack",      href: "/nexus-hardware-os",     icon: HardDrive},
      { title: "Quantum Threshold",     description: "Silicon wall & tunneling limits",    href: "/quantum-threshold",     icon: GitBranch},
    ],
  },
  {
    label: "Research & Advocacy",
    subtitle: "Theory · Presentation · Post-silicon manifesto",
    accent: YELLOW,
    items: [
      { title: "Research",              description: "Lambda Boson theory",                href: "/workspace/research",    icon: FlaskConical },
      { title: "Research Presentation", description: "Physics bridges & tooltips",         href: "/research-presentation", icon: Presentation },
      { title: "Wavelength OS",         description: "Post-silicon manifesto",             href: "/wavelength-os",         icon: BookOpen },
      { title: "Computing Alternatives",description: "Beyond silicon paradigms",           href: "/computing-alternatives",icon: Cpu      },
    ],
  },
  {
    label: "Network & Identity",
    subtitle: "P2P · Wallet · Secure comms · Community",
    accent: ORANGE,
    items: [
      { title: "Wallet",                description: "NXT token management",               href: "/wallet",                icon: Wallet   },
      { title: "Transmission",          description: "P2P media sharing",                  href: "/workspace/transmission",icon: Radio    },
      { title: "Secure Documents",      description: "Lambda-signed DOCX vault",           href: "/secure-docs",           icon: Shield   },
      { title: "Friends",               description: "Community & connections",             href: "/friends",               icon: Users    },
      { title: "Inbox",                 description: "Lambda-encoded messages",             href: "/inbox",                 icon: Mail     },
      { title: "Live Streaming",        description: "Broadcast & watch live",             href: "/streaming",             icon: Activity },
    ],
  },
  {
    label: "Platform & Licensing",
    subtitle: "AGPL-3.0 · API tiers · Hardware licensing",
    accent: RED,
    items: [
      { title: "Pricing & Licensing",   description: "Open / Pro / Kernel / Enterprise",  href: "/pricing",               icon: DollarSign },
      { title: "Developer Matrix",      description: "SDK & integration docs",             href: "/developer-matrix",      icon: Code2    },
    ],
  },
];

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
            A complete civilisation architecture built on quantum physics
          </p>
          <p className="text-slate-600 text-xs font-mono">
            Λ = hf/c²  ·  Z₀ = 376.73 Ω  ·  f₀ = 555 THz  ·  f_r = 7.83 Hz  ·  AGPL-3.0
          </p>
          <div className="mt-4 mx-auto max-w-md">
            <SpectrumBar />
          </div>
        </div>

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
