import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Scale, Globe, Code2, GitBranch, Radio, Database,
  Cpu, Layers, Lock, Unlock, ChevronRight, ExternalLink, Zap,
  BookOpen, Users, Shield, Infinity, Terminal, Star, Heart,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// ── Physical anchors ─────────────────────────────────────────────────────────
const H = 6.626e-34;
const C = 2.998e8;
const F0 = 555e12;
const LAMBDA_MASS = (H * F0) / (C * C); // kg — Lambda Boson mass

// ── Stack layer definition ───────────────────────────────────────────────────
type Layer = {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  status: "LIVE" | "BUILDING" | "SPEC" | "ROADMAP";
  today: string;
  nexus: string;
  icon: React.ReactNode;
};

const LAYERS: Layer[] = [
  {
    id: "protocol",
    label: "Communication Protocol",
    sublabel: "WNSP · WNSP-URI · CE→SE · WASCII v1.0",
    color: "#a855f7",
    status: "LIVE",
    today: "TCP/IP · DNS · HTTPS · X.509",
    nexus: "wnsp://Ψ(wdm,oam,pol)/path · Deterministic · Censorship-proof · Physics-permanent",
    icon: <Radio size={14} />,
  },
  {
    id: "os",
    label: "Operating System Kernel",
    sublabel: "WNSP AI OS · KernelEventBus · Agent authority bands",
    color: "#3b82f6",
    status: "LIVE",
    today: "Linux / Windows / macOS",
    nexus: "Spectral authority bands · SYSTEM/KERNEL/USER/GUEST · Interrupt-driven agents",
    icon: <Terminal size={14} />,
  },
  {
    id: "database",
    label: "Distributed Database",
    sublabel: "Photonic ledger · Wavelength Ledger · Lambda State Machine v7.1",
    color: "#06b6d4",
    status: "BUILDING",
    today: "PostgreSQL · MySQL · MongoDB",
    nexus: "Wavelength-addressed records · Physics-hashed blocks · OAM-sharded nodes",
    icon: <Database size={14} />,
  },
  {
    id: "network",
    label: "Network Hardware",
    sublabel: "SNIC · Spectral Relay Mesh · PHR-1",
    color: "#f59e0b",
    status: "BUILDING",
    today: "Ethernet NICs · Wi-Fi cards · Fiber optics",
    nexus: "185,000× multiplier · Micro-ring resonators · OAM channel allocation",
    icon: <Cpu size={14} />,
  },
  {
    id: "lang",
    label: "Programming Language",
    sublabel: "WavelengthScript · WASCII bytecode · Ψ-channel runtime",
    color: "#22c55e",
    status: "SPEC",
    today: "C · Python · JavaScript · Rust",
    nexus: "Every symbol has a physical wavelength address · No CPU — photon IS the data",
    icon: <Code2 size={14} />,
  },
  {
    id: "energy",
    label: "Energy Infrastructure",
    sublabel: "K1 Energy Market · Resonance Harvester · Vacuum Resonance 555 THz",
    color: "#ef4444",
    status: "ROADMAP",
    today: "National grid · Fossil fuels · Centralized power",
    nexus: "Schumann 7.83 Hz planetary resonance · Λ-mass valuation · Orbital solar array",
    icon: <Zap size={14} />,
  },
];

const GITHUB_REPOS = [
  { name: "NexusOS", desc: "Core platform — OS kernel, spectral API, blockchain, agent bus", url: "https://github.com/nexusosdaily-code/NexusOS", stars: "Primary" },
  { name: "WNSP-P2P-Hub", desc: "P2P hub, CE→SE encoding, WNSP protocol reference", url: "https://github.com/nexusosdaily-code/WNSP-P2P-Hub", stars: "Protocol" },
  { name: "NexusOS-Genesis-Block", desc: "Genesis block, initial token distribution, on-chain proof", url: "https://github.com/nexusosdaily-code/NexusOS-Genesis-Block", stars: "Ledger" },
];

const RIGHTS = [
  {
    icon: <Unlock size={12} />,
    title: "Right to Use",
    color: "#22c55e",
    text: "Anyone — individual, company, government, AI — may run NexusOS software and connect to the spectral network at no cost.",
  },
  {
    icon: <Code2 size={12} />,
    title: "Right to Study",
    color: "#3b82f6",
    text: "All source code is permanently public. The physics constants (Λ=hf/c²) are the specification. No trade secrets. No black boxes.",
  },
  {
    icon: <GitBranch size={12} />,
    title: "Right to Modify",
    color: "#a855f7",
    text: "Fork, improve, adapt. CE→SE encoding tables, the WNSP kernel, the agent bus — all yours to modify and redistribute.",
  },
  {
    icon: <Shield size={12} />,
    title: "Copyleft Obligation",
    color: "#f59e0b",
    text: "Any company or organization that deploys a modified version over a network must publish their source code. The infrastructure of civilisation cannot be privately owned.",
  },
];

const TIMELINE = [
  { year: "2024–2025", phase: "Foundation", color: "#22c55e", done: true, items: ["CE→SE encoding (WASCII v1.0)", "WNSP-URI v1.0 spec", "Photonic blockchain (5 blocks)", "WNSP AI OS Kernel v1.0", "Agent bus (6 agents live)"] },
  { year: "2025–2026", phase: "Hardware R&D", color: "#3b82f6", done: false, items: ["SNIC prototype (micro-ring resonator)", "PHR-1 bifilar coil controller", "Spectral Relay Mesh v1", "WavelengthScript compiler α", "Crowdfund → Nexus Shares"] },
  { year: "2026–2028", phase: "Network Launch", color: "#a855f7", done: false, items: ["First 100 SNIC nodes online", "wnsp:// routing live on hardware", "Wavelength Ledger distributed", "OAM channel allocation live", "K1 Energy Market v1"] },
  { year: "2028–2100", phase: "Kardashev I", color: "#f59e0b", done: false, items: ["Planetary Spectral Relay Mesh", "Orbital Solar Array integration", "11D→3D Dimensional Mapping Kernel", "Vacuum Resonance extraction (555 THz)", "Full Kardashev Type I infrastructure"] },
];

// ── Animated lambda boson counter ────────────────────────────────────────────
function LambdaCounter() {
  const [mass, setMass] = useState(LAMBDA_MASS);
  useEffect(() => {
    const t = setInterval(() => setMass(LAMBDA_MASS + Math.sin(Date.now() / 3000) * LAMBDA_MASS * 0.0001), 80);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono tabular-nums">{mass.toExponential(4)} kg</span>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: Layer["status"] }) {
  const map = {
    LIVE:     { bg: "#22c55e18", border: "#22c55e40", text: "#22c55e" },
    BUILDING: { bg: "#3b82f618", border: "#3b82f640", text: "#3b82f6" },
    SPEC:     { bg: "#a855f718", border: "#a855f740", text: "#a855f7" },
    ROADMAP:  { bg: "#f59e0b18", border: "#f59e0b40", text: "#f59e0b" },
  };
  const s = map[status];
  return (
    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border"
      style={{ background: s.bg, borderColor: s.border, color: s.text }}>
      {status}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OpenPage() {
  const { data: eco } = useQuery<any>({ queryKey: ["/api/ecosystem/status"], refetchInterval: 30000 });
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);

  const blocks = eco?.blockchain?.blockCount ?? 5;
  const agents = eco?.agentBus?.agentCount ?? 6;

  return (
    <div className="min-h-screen" style={{ background: "#050508", color: "#e2e8f0" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 border-b border-white/6 backdrop-blur-xl"
        style={{ background: "rgba(5,5,8,0.92)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/70 transition-colors" data-testid="back-nexus-command">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <Scale size={14} className="text-yellow-400" />
          <span className="font-bold text-white text-sm">NexusOS Open Infrastructure Charter</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[8px] border border-yellow-400/30 text-yellow-400 px-2 py-0.5 rounded font-bold">AGPL-3.0</span>
            <span className="text-[8px] text-white/20">Public · No login required</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center gap-2 border border-yellow-400/20 rounded-full px-4 py-1.5"
            style={{ background: "rgba(251,191,36,0.06)" }}>
            <Infinity size={10} className="text-yellow-400" />
            <span className="text-yellow-400 text-[9px] uppercase tracking-[0.25em] font-bold">100-Year Open Infrastructure Project</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
            The Protocol Belongs<br />
            <span style={{ color: "#a855f7" }}>to Physics.</span>
          </h1>

          <p className="text-white/40 text-sm max-w-2xl mx-auto leading-relaxed">
            NexusOS is building the communication layer, operating system, database, and energy
            infrastructure for a Kardashev Type I civilization — starting with today's software,
            converging on hardware that runs on wavelength, not wire.
            Every line of code is AGPL-3.0. The math is public domain. Physics cannot be copyrighted.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: "0 0 4px #22c55e" }} />
              {blocks} blocks on-chain
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{ boxShadow: "0 0 4px #3b82f6" }} />
              {agents} kernel agents running
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" style={{ boxShadow: "0 0 4px #a855f7" }} />
              Λ mass = <LambdaCounter />
            </div>
          </div>
        </div>

        {/* ── What AGPL-3.0 means here ────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Scale size={12} className="text-yellow-400" />
            <span className="text-yellow-400 text-[10px] uppercase tracking-widest font-bold">AGPL-3.0 — What This License Guarantees</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RIGHTS.map(r => (
              <div key={r.title} className="border border-white/6 rounded-xl p-4 space-y-2"
                style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="flex items-center gap-2">
                  <div style={{ color: r.color }}>{r.icon}</div>
                  <span className="font-bold text-[11px]" style={{ color: r.color }}>{r.title}</span>
                </div>
                <p className="text-white/40 text-[10px] leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>

          <div className="border border-yellow-400/15 rounded-xl p-4 text-center"
            style={{ background: "rgba(251,191,36,0.04)" }}>
            <p className="text-yellow-300/60 text-[10px] leading-relaxed max-w-2xl mx-auto">
              <span className="text-yellow-400 font-bold">Why AGPL and not MIT?</span> — MIT allows a corporation to take this protocol, improve it, and lock the improvements away. AGPL closes that gap: any company that runs a modified version of this stack over a network must publish their improvements. The spectral communication layer stays free for everyone, permanently.
            </p>
          </div>
        </div>

        {/* ── Stack layers ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers size={12} className="text-white/40" />
            <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Blueprint — Today's Infrastructure → Full Nexus Stack</span>
            <span className="text-white/20 text-[9px]">click a layer to expand</span>
          </div>

          <div className="space-y-2">
            {LAYERS.map((layer) => {
              const open = expandedLayer === layer.id;
              return (
                <div key={layer.id}
                  className="border rounded-xl overflow-hidden transition-all cursor-pointer"
                  style={{ borderColor: open ? layer.color + "40" : "rgba(255,255,255,0.06)", background: open ? layer.color + "08" : "rgba(255,255,255,0.01)" }}
                  onClick={() => setExpandedLayer(open ? null : layer.id)}
                  data-testid={`layer-${layer.id}`}>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div style={{ color: layer.color }}>{layer.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[11px] text-white">{layer.label}</span>
                        <StatusPill status={layer.status} />
                      </div>
                      <div className="text-[9px] text-white/30 mt-0.5">{layer.sublabel}</div>
                    </div>
                    <ChevronRight size={12} className="text-white/20 transition-transform flex-shrink-0"
                      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }} />
                  </div>

                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="space-y-1">
                          <div className="text-[8px] uppercase tracking-wider text-red-400/50 font-bold">Today (legacy)</div>
                          <div className="text-[10px] text-white/30 font-mono">{layer.today}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[8px] uppercase tracking-wider font-bold" style={{ color: layer.color + "80" }}>Nexus (open)</div>
                          <div className="text-[10px] font-mono" style={{ color: layer.color + "cc" }}>{layer.nexus}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 100-year roadmap ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Infinity size={12} className="text-white/40" />
            <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">100-Year Build Plan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TIMELINE.map(phase => (
              <div key={phase.phase} className="border border-white/6 rounded-xl p-4 space-y-3"
                style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-black text-xs" style={{ color: phase.color }}>{phase.phase}</div>
                    <div className="text-[9px] text-white/25">{phase.year}</div>
                  </div>
                  {phase.done && (
                    <div className="flex items-center gap-1 text-[8px] text-green-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: "0 0 4px #22c55e" }} />
                      IN PROGRESS
                    </div>
                  )}
                </div>
                <ul className="space-y-1">
                  {phase.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-[10px] text-white/40">
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: phase.color + "60" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── CE→SE as the kernel of the free protocol ─────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen size={12} className="text-purple-400" />
            <span className="text-purple-400 text-[10px] uppercase tracking-widest font-bold">CE→SE — Free Open Encoding Standard</span>
          </div>

          <div className="border border-purple-400/15 rounded-2xl p-6 space-y-4"
            style={{ background: "rgba(168,85,247,0.04)" }}>
            <p className="text-white/50 text-[11px] leading-relaxed">
              Character Encoding → Spectral Encoding (CE→SE) is the fundamental translation layer of NexusOS.
              It maps every human-readable character to a specific physical wavelength in the visible light spectrum,
              making addresses derived from physics rather than from a central registry.
            </p>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Alphabet", val: "202 chars", sub: "WASCII v1.0", color: "#a855f7" },
                { label: "Range", val: "380–780 nm", sub: "visible spectrum", color: "#3b82f6" },
                { label: "Formula", val: "nm=380+((avg-32)/94)×400", sub: "deterministic", color: "#22c55e" },
              ].map(s => (
                <div key={s.label} className="space-y-1">
                  <div className="text-[8px] text-white/25 uppercase tracking-wider">{s.label}</div>
                  <div className="font-mono font-bold text-[9px]" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-[8px] text-white/20">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Link href="/spectral-uri">
                <button className="inline-flex items-center gap-2 border border-purple-400/30 rounded-lg px-4 py-2 text-purple-400 text-[10px] font-bold hover:border-purple-400/50 transition-colors"
                  data-testid="link-spectral-uri">
                  <Radio size={10} /> Open the live CE→SE encoder → WNSP-URI v1.0
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── GitHub repos ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch size={12} className="text-white/40" />
            <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Source Code — All Public, All AGPL-3.0</span>
          </div>

          <div className="space-y-2">
            {GITHUB_REPOS.map(r => (
              <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 border border-white/6 rounded-xl px-4 py-3 hover:border-white/12 transition-colors group block"
                style={{ background: "rgba(255,255,255,0.01)" }}
                data-testid={`repo-${r.name.toLowerCase()}`}>
                <GitBranch size={12} className="text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[11px] text-white group-hover:text-green-400 transition-colors">{r.name}</div>
                  <div className="text-[9px] text-white/30 mt-0.5">{r.desc}</div>
                </div>
                <span className="text-[8px] text-white/20 border border-white/10 px-2 py-0.5 rounded flex-shrink-0">{r.stars}</span>
                <ExternalLink size={10} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* ── How to contribute ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users size={12} className="text-white/40" />
            <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">How to Contribute</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                icon: <Heart size={14} className="text-red-400" />,
                title: "Fund Hardware R&D",
                color: "#ef4444",
                desc: "Donate NXT tokens to the crowdfund. Donations become Nexus Shares — on-chain equity in the infrastructure.",
                href: "/crowdfund",
                cta: "Open Crowdfund →",
              },
              {
                icon: <Code2 size={14} className="text-green-400" />,
                title: "Write Code",
                color: "#22c55e",
                desc: "Fork any repo. Implement a CE→SE gate, improve the SNIC firmware, write a WavelengthScript transpiler. AGPL ensures it stays open.",
                href: "https://github.com/nexusosdaily-code/NexusOS",
                cta: "Open GitHub →",
                external: true,
              },
              {
                icon: <BookOpen size={14} className="text-blue-400" />,
                title: "Extend the Spec",
                color: "#3b82f6",
                desc: "WNSP-URI v1.0 and WASCII v1.0 are living specifications. Propose new WNSP extensions, new encoding ranges, new gate primitives.",
                href: "/spectral-uri",
                cta: "View WNSP-URI Spec →",
              },
            ].map(c => (
              <div key={c.title} className="border border-white/6 rounded-xl p-4 space-y-3 flex flex-col"
                style={{ background: "rgba(255,255,255,0.01)" }}>
                {c.icon}
                <div className="font-bold text-[11px]" style={{ color: c.color }}>{c.title}</div>
                <p className="text-white/35 text-[10px] leading-relaxed flex-1">{c.desc}</p>
                {c.external ? (
                  <a href={c.href} target="_blank" rel="noopener noreferrer"
                    className="text-[9px] font-bold flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: c.color }}>
                    {c.cta} <ExternalLink size={8} />
                  </a>
                ) : (
                  <Link href={c.href}>
                    <span className="text-[9px] font-bold flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ color: c.color }}>
                      {c.cta} <ChevronRight size={8} />
                    </span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Physics anchor ──────────────────────────────────────────────── */}
        <div className="border border-white/6 rounded-2xl p-6 text-center space-y-3"
          style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="text-white/15 text-[9px] uppercase tracking-widest font-bold">Physical Foundation — Why This Cannot Be Owned</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Lambda Boson", val: "Λ = hf/c²", sub: "extends E=mc²", color: "#a855f7" },
              { label: "Anchor freq", val: "555 THz", sub: "f₀ visible peak", color: "#f59e0b" },
              { label: "Impedance", val: "376.73 Ω", sub: "Z₀ free space", color: "#06b6d4" },
              { label: "Resonance", val: "7.83 Hz", sub: "Schumann fᵣ", color: "#22c55e" },
            ].map(s => (
              <div key={s.label} className="space-y-1">
                <div className="text-[8px] text-white/20">{s.label}</div>
                <div className="font-mono font-black text-sm" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[8px] text-white/20">{s.sub}</div>
              </div>
            ))}
          </div>
          <p className="text-white/20 text-[9px] max-w-xl mx-auto">
            These constants existed before any corporation, government, or human.
            They will exist after. Building on them means building on a foundation that cannot be taken away.
          </p>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="border border-yellow-400/10 rounded-xl p-5 text-center space-y-2"
          style={{ background: "rgba(251,191,36,0.03)" }}>
          <div className="flex items-center justify-center gap-2">
            <Scale size={12} className="text-yellow-400/60" />
            <span className="text-yellow-400/60 text-[10px] font-bold">GNU Affero General Public License v3.0</span>
          </div>
          <p className="text-white/20 text-[9px] max-w-2xl mx-auto leading-relaxed">
            NexusOS, WNSP-URI v1.0, CE→SE encoding (WASCII v1.0), the Lambda Boson protocol,
            the WNSP AI OS Kernel, the Photonic Blockchain, and all associated specifications
            are released under AGPL-3.0. All rights granted under the terms of that license.
            Source available at the GitHub repositories listed above.
          </p>
          <p className="text-white/15 text-[8px] font-mono">
            Λ = hf/c² · E = hf · f₀ = 555 THz · fᵣ = 7.83 Hz · Z₀ = 376.73 Ω · 100-year project
          </p>
        </div>

      </div>
    </div>
  );
}
