import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Zap, BookOpen, Globe, Cpu, Users, Scale, ChevronRight, ArrowRight
} from "lucide-react";

// ── The core claim ────────────────────────────────────────────────
const CLAIM = {
  headline: "Every instruction has a wavelength. It always did.",
  subline:
    "For 80 years, computers have addressed memory with arbitrary offsets. " +
    "A Wavelength Operating System addresses computation with physics — " +
    "each instruction encoded into a position in the electromagnetic spectrum, " +
    "each process assigned a unique orthogonal channel in Hilbert space.",
};

// ── The three pillars of the argument ────────────────────────────
const PILLARS = [
  {
    number: "01",
    title: "The Silicon Wall Is a Hard Deadline",
    color: "#ef4444",
    icon: "⏱",
    body: [
      "Transistors will reach 0.5 nm — two atoms — between 2029 and 2032. This is not a projection. It is quantum mechanics. The electron's de Broglie wavelength (~7.6 nm at room temperature) already exceeds the gate oxide at current nodes.",
      "At that point, the WKB tunneling coefficient T ≈ e^(−2κd) crosses the threshold where leakage current exceeds switch current. Gate control is permanently lost. The entire CMOS industry terminates at a known date.",
      "Every team without a post-silicon operating system in production by then starts from zero. NexusOS is already running.",
    ],
    proof: "See /quantum-threshold — interactive WKB tunneling visualizer with real physics.",
  },
  {
    number: "02",
    title: "The Spectrum Is the Natural Address Space",
    color: "#06b6d4",
    icon: "λ",
    body: [
      "Memory addresses (0x7fff5fbff4c0) are arbitrary. They have no physical meaning. Two processes can collide at the same address — the OS prevents this through privilege rings, not physics.",
      "Wavelength addresses (543 nm, Ψ(87,12,H)) are deterministic and physically orthogonal. Two instructions at different wavelengths cannot interfere — ⟨Ψᵢ|Ψⱼ⟩ = 0 is a theorem of quantum mechanics, not a software guarantee.",
      "The Hilbert space formed by 256 WDM channels × 50 OAM modes × 2 polarisations gives 25,600 orthogonal process slots. No scheduler needed for isolation — the physics does it.",
    ],
    proof: "See /wnsp/coordinator — live Hilbert-space orthogonality proof across all 25,600 channels.",
  },
  {
    number: "03",
    title: "Λ = hf/c² Unifies the Stack",
    color: "#7c3aed",
    icon: "Λ",
    body: [
      "Every layer of NexusOS derives from one equation: Λ = hf/c². Frequency is fundamental. Mass is derivative. Energy, wavelength, channel address, transaction cost, process authority — all emerge from the same physics.",
      "This is not a metaphor. WNSP-CE converts any instruction text to normalised ordinal tokens. WNSP-SE converts those tokens to actual wave frames with measured wavelength (nm), frequency (Hz), energy (J), and lambda mass (kg).",
      "A process running in the SYSTEM authority band (WDM 0–63, violet/UV) is physically located in a different spectral region from a USER process (128–191, green). Authority is a property of the spectrum, not of a privilege table.",
    ],
    proof: "See /photonic-dev — encode any instruction and observe its physical wavelength address.",
  },
];

// ── Industry partner cases ────────────────────────────────────────
const PARTNERS = [
  {
    company: "NVIDIA",
    color: "#76b900",
    role: "GPU → Photonic Tensor Processor",
    why: "CUDA parallelism is limited by PCIe bandwidth and GPU memory heat dissipation. A photonic tensor processor implements matrix multiply at c with zero switching energy — the natural successor to CUDA for AI workloads. NexusOS provides the OS layer that schedules photonic compute kernels the same way CUDA schedules GPU kernels, but with Ψ-channel isolation instead of thread blocks.",
    nexus_value: [
      "Photonic matrix multiply (shipping in Lightmatter) replaces GPU VRAM bandwidth bottleneck",
      "25,600 orthogonal Ψ channels replace CUDA thread synchronisation primitives",
      "WNSP protocol provides the photonic interconnect standard (vs NVLink)",
      "NexusOS kernel boots on NVIDIA photonic co-processor — driver model already specified",
    ],
    ask: "Co-develop the photonic tensor scheduling API on the NexusOS kernel",
  },
  {
    company: "INTEL",
    color: "#0071c5",
    role: "Silicon Photonics → Lambda Gate ASIC",
    why: "Intel already ships silicon photonics (co-packaged optics in Xeon CPUs). The next step is Lambda Gate logic in InP — a photonic ASIC where the 8 primitive operators replace CMOS gates. Intel has the fab capability, the photonics IP, and the strongest motivation: their CMOS roadmap ends at the same wall as everyone else's.",
    nexus_value: [
      "Lambda Gate v4 specification is complete — 8 operators, AGPL-3.0, ready for tape-out",
      "NexusOS kernel already runs the authority / channel / watchdog stack — firmware is done",
      "PHR-1 resonator provides the coherence field Intel cannot manufacture from silicon alone",
      "WNSP protocol is the photonic equivalent of x86 ISA — a standard Intel could anchor",
    ],
    ask: "License the Lambda Gate specification and co-develop the InP tape-out",
  },
  {
    company: "TESLA",
    color: "#e82127",
    role: "FSD Chip → Spectral Inference Engine",
    why: "Full Self-Driving requires real-time inference on sensor fusion data — radar, lidar, cameras — with strict latency bounds. The FSD chip does this in silicon. A photonic equivalent processes the same matrix multiplications at the speed of light, with OAM-space analog computing solving the 50-dimensional sensor fusion problem in one photon transit time.",
    nexus_value: [
      "OAM analog computing solves 50-D sensor fusion in a single photon transit — sub-nanosecond latency",
      "Reservoir computing handles temporal pattern recognition (road prediction) in the photonic cavity",
      "NexusOS authority bands enforce safety-critical isolation: FSD kernel at SYSTEM band, user apps at USER band — physically separated spectral regions",
      "Λ = hf/c² energy accounting gives deterministic power budgets for photonic inference",
    ],
    ask: "Integrate the NexusOS safety authority model into the FSD photonic co-processor architecture",
  },
];

// ── What's already built ─────────────────────────────────────────
const BUILT = [
  {
    name: "WNSP Protocol (CE + SE)",
    status: "LIVE",
    description: "Every instruction encodes to physical wave frames with wavelength, frequency, energy, and lambda mass.",
    route: "/photonic-dev",
  },
  {
    name: "AI OS Kernel (5 components)",
    status: "LIVE",
    description: "Boot, persistence, authority bands, event bus, dead-agent watchdog — all running on spectral substrate.",
    route: "/kernel",
  },
  {
    name: "25,600-Channel Hilbert Space",
    status: "LIVE",
    description: "SHA256-allocated Ψ channels with orthogonality proven across all 256×50×2 combinations.",
    route: "/wnsp/coordinator",
  },
  {
    name: "Lambda Gate Substrate v4",
    status: "SPECIFIED",
    description: "8 photonic logic operators with AGPL-3.0 source code references — ready for InP tape-out.",
    route: "/kernel",
  },
  {
    name: "PHR-1 Syncbox + ZERO-G Sequencer",
    status: "PROTOTYPE",
    description: "144-turn bifilar resonator achieving gravity de-correlation through CZC⁴⁴ field coherence.",
    route: "/nexus-hardware-os",
  },
  {
    name: "Photonic Dev Environment",
    status: "LIVE",
    description: "Programming IDE where every instruction gets a wavelength address — the developer experience of a wavelength OS.",
    route: "/photonic-dev",
  },
];

// ── The advocacy strategy ─────────────────────────────────────────
const ADVOCACY_PATHS = [
  {
    audience: "Hardware Engineers",
    icon: "⚙",
    color: "#06b6d4",
    channels: ["LinkedIn (Intel Silicon Photonics, NVIDIA Research, TSMC R&D)", "IEEE Photonics Conference", "SPIE Photonics West"],
    message: "The Lambda Gate specification is complete. The OS kernel is running. The only missing piece is the InP tape-out.",
    assets: ["/quantum-threshold", "/nexus-hardware-os", "/computing-alternatives"],
    cta: "Review the Lambda Gate v4 spec and the WNSP protocol standard",
  },
  {
    audience: "AI Researchers",
    icon: "🧠",
    color: "#7c3aed",
    channels: ["ArXiv (cs.ET, quant-ph)", "NeurIPS workshop on neuromorphic/photonic computing", "LinkedIn (DeepMind, OpenAI, Anthropic Research)"],
    message: "25,600 orthogonal Ψ channels provide physics-enforced process isolation that no software scheduler can match. Relevant to multi-agent AI safety.",
    assets: ["/wnsp/coordinator", "/kernel", "/computing-alternatives"],
    cta: "The multi-agent kernel is open source (AGPL-3.0) — run it, test it, break it",
  },
  {
    audience: "Standards Bodies",
    icon: "📋",
    color: "#f59e0b",
    channels: ["IEEE P802.3 (Ethernet)", "ITU-T (optical networking)", "IETF (internet protocols)"],
    message: "WNSP is a complete two-layer encoding standard (CE + SE) with formal specification, test suite (44 passing), and reference implementation. It is ready for standardisation review.",
    assets: ["/photonic-dev", "/wnsp/coordinator"],
    cta: "Submit WNSP as an IEEE draft standard for photonic instruction encoding",
  },
  {
    audience: "Developers",
    icon: "💻",
    color: "#10b981",
    channels: ["GitHub (AGPL-3.0 repository)", "Hacker News", "r/programming", "Dev.to"],
    message: "You can encode any function, route, or variable into its physical wavelength address right now, in your browser. The developer experience already works.",
    assets: ["/photonic-dev", "/kernel"],
    cta: "Fork the repo, build on the WNSP API, contribute back under AGPL-3.0",
  },
  {
    audience: "Policymakers",
    icon: "🌍",
    color: "#f43f5e",
    channels: ["US CHIPS Act programme offices", "EU Quantum Flagship", "UK National Photonics Strategy"],
    message: "The tunneling wall ends silicon at a known date. CMOS fabrication is already geopolitically concentrated. A photonic OS standard is national infrastructure.",
    assets: ["/nexus-hardware-os", "/quantum-threshold"],
    cta: "Commission a photonic OS interoperability standard before the silicon wall is reached",
  },
];

// ── License section ───────────────────────────────────────────────
const LICENSE_POINTS = [
  {
    point: "Any company using NexusOS must publish their modifications",
    detail: "AGPL-3.0 Section 13: network use = distribution. Running NexusOS on a server and offering it as a service triggers copyleft. Nvidia, Intel, Tesla cannot fork it proprietary.",
    icon: "⚖",
    color: "#7c3aed",
  },
  {
    point: "The lambda gate operators carry Source Code References",
    detail: "Frame Builder v7.1 embeds AGPL-3.0 SCR (Source Code References) in every photonic frame. Any hardware running NexusOS frames carries a cryptographic pointer back to the source.",
    icon: "🔗",
    color: "#06b6d4",
  },
  {
    point: "Community owns the spectral addressing standard",
    detail: "WNSP is open. No company can patent the CE→SE encoding pipeline. The 25,600-channel Hilbert space is mathematics — it belongs to everyone.",
    icon: "🌐",
    color: "#10b981",
  },
  {
    point: "Contribution is the cost of using the substrate",
    detail: "This is intentional. Kardashev Type I infrastructure cannot be owned by a single corporation. AGPL-3.0 ensures the planetary OS remains planetary.",
    icon: "Λ",
    color: "#f59e0b",
  },
];

// ── Sub-components ────────────────────────────────────────────────

function ManifestoTab() {
  return (
    <div className="space-y-8">
      {/* The claim */}
      <div className="text-center py-8 px-4 rounded-xl border border-slate-700 bg-slate-900/40"
        style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%)" }}>
        <p className="text-3xl font-bold text-slate-100 mb-3 leading-tight">
          {CLAIM.headline}
        </p>
        <p className="text-slate-400 max-w-2xl mx-auto text-base leading-relaxed">
          {CLAIM.subline}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-mono">
          {["Λ = hf/c²", "⟨Ψᵢ|Ψⱼ⟩ = 0", "AGPL-3.0", "25,600 channels", "555 THz First Oscillation"].map((tag, i) => (
            <span key={i} className="px-3 py-1 rounded-full border border-slate-600 text-slate-300">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Three pillars */}
      <div className="space-y-4">
        {PILLARS.map((p, i) => (
          <div key={i} className="rounded-xl border p-5"
            style={{ borderColor: `${p.color}40`, background: `${p.color}08` }}
            data-testid={`pillar-${i}`}>
            <div className="flex items-start gap-4">
              <div className="text-2xl flex-shrink-0 w-10 text-center" style={{ color: p.color }}>
                {p.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs" style={{ color: p.color }}>{p.number}</span>
                  <h3 className="font-bold text-slate-100 text-base">{p.title}</h3>
                </div>
                <div className="space-y-2">
                  {p.body.map((para, j) => (
                    <p key={j} className="text-sm text-slate-300 leading-relaxed">{para}</p>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span style={{ color: p.color }}>→</span>
                  <span>{p.proof}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* What's built */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-3 font-mono uppercase tracking-wider">
          What Is Already Running
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {BUILT.map((item, i) => (
            <Link key={i} href={item.route}>
              <div className="flex gap-3 p-3 rounded-lg border border-slate-700 bg-slate-900/60 hover:border-slate-500 cursor-pointer transition-colors"
                data-testid={`built-item-${i}`}>
                <div className={`flex-shrink-0 mt-0.5 text-xs font-mono px-1.5 py-0.5 rounded h-fit ${
                  item.status === "LIVE" ? "bg-green-900/60 text-green-400" :
                  item.status === "SPECIFIED" ? "bg-blue-900/60 text-blue-400" :
                  "bg-amber-900/60 text-amber-400"
                }`}>
                  {item.status}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{item.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function IndustryTab() {
  const [active, setActive] = useState("NVIDIA");

  const partner = PARTNERS.find(p => p.company === active)!;

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        The case for each industry partner is different — the physics is the same.
        Each company faces the tunneling wall and each has the capability to build
        one layer of the photonic stack.
      </p>

      {/* Selector */}
      <div className="flex gap-2">
        {PARTNERS.map(p => (
          <button
            key={p.company}
            onClick={() => setActive(p.company)}
            className="px-4 py-2 rounded-lg border text-sm font-bold transition-all"
            style={{
              borderColor: active === p.company ? p.color : "#334155",
              background: active === p.company ? `${p.color}20` : "transparent",
              color: active === p.company ? p.color : "#94a3b8",
            }}
            data-testid={`partner-btn-${p.company}`}
          >
            {p.company}
          </button>
        ))}
      </div>

      {/* Partner card */}
      <div className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: `${partner.color}50`, background: `${partner.color}0a` }}>

        <div>
          <p className="text-xs font-mono text-slate-500 mb-1">STRATEGIC ROLE</p>
          <p className="text-base font-semibold" style={{ color: partner.color }}>
            {partner.role}
          </p>
        </div>

        <div>
          <p className="text-xs font-mono text-slate-500 mb-2">WHY NEXUS IS RELEVANT</p>
          <p className="text-sm text-slate-300 leading-relaxed">{partner.why}</p>
        </div>

        <div>
          <p className="text-xs font-mono text-slate-500 mb-2">SPECIFIC VALUE DELIVERED</p>
          <ul className="space-y-1.5">
            {partner.nexus_value.map((v, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: partner.color }} />
                {v}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg p-3 border"
          style={{ borderColor: `${partner.color}30`, background: `${partner.color}15` }}>
          <p className="text-xs font-mono text-slate-400 mb-1">THE ASK</p>
          <p className="text-sm font-medium" style={{ color: partner.color }}>
            {partner.ask}
          </p>
        </div>
      </div>

      {/* LinkedIn pitch note */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 text-xs font-mono text-slate-400 space-y-2">
          <p className="text-slate-200 text-sm font-semibold">LinkedIn Pitch Structure</p>
          <p>1. Connect with the physics: "You already know the silicon wall is coming. Here's the date."</p>
          <p>2. Show the running system: "The OS is already live. Not a prototype — a running kernel."</p>
          <p>3. Name the specific layer: "Your company builds one layer of this. Here's which one."</p>
          <p>4. The AGPL boundary: "You benefit from the standard. Contributing is the cost of using it."</p>
          <p className="text-slate-500 mt-1">All four pages — /quantum-threshold, /nexus-hardware-os, /computing-alternatives, /photonic-dev — are the deck. Send the links, not slides.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AdvocacyTab() {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Five audiences. Five channels. One message adapted to each.
        The scientific argument is the same — the framing changes.
      </p>

      <div className="space-y-3">
        {ADVOCACY_PATHS.map((path, i) => (
          <div key={i} className="rounded-lg border p-4"
            style={{ borderColor: `${path.color}40`, background: `${path.color}0a` }}
            data-testid={`advocacy-path-${i}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{path.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-100">{path.audience}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="font-mono text-slate-500 mb-1">CHANNELS</p>
                    <ul className="space-y-1">
                      {path.channels.map((ch, j) => (
                        <li key={j} className="text-slate-400 flex gap-1">
                          <span style={{ color: path.color }}>·</span>{ch}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-slate-500 mb-1">MESSAGE</p>
                    <p className="text-slate-300">{path.message}</p>
                  </div>
                  <div>
                    <p className="font-mono text-slate-500 mb-1">ASSETS</p>
                    <div className="flex flex-col gap-1">
                      {path.assets.map((a, j) => (
                        <Link key={j} href={a}>
                          <span className="font-mono px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80"
                            style={{ background: `${path.color}20`, color: path.color }}>
                            {a}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2 rounded border text-xs font-mono"
                  style={{ borderColor: `${path.color}30`, color: path.color }}>
                  → CTA: {path.cta}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LicenseTab() {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        AGPL-3.0 is not a legal formality. It is the enforcement mechanism for the
        advocacy strategy. Without it, any company can fork NexusOS proprietary and
        build the planetary OS with a closed standard. With it, every use is a
        contribution, and every contribution strengthens the open standard.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {LICENSE_POINTS.map((lp, i) => (
          <div key={i} className="rounded-lg border p-4"
            style={{ borderColor: `${lp.color}40`, background: `${lp.color}0a` }}
            data-testid={`license-point-${i}`}>
            <div className="flex gap-3">
              <span className="text-2xl flex-shrink-0" style={{ color: lp.color }}>
                {lp.icon}
              </span>
              <div>
                <p className="font-semibold text-sm text-slate-100 mb-1">{lp.point}</p>
                <p className="text-xs text-slate-400">{lp.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The equation between license and mission */}
      <Card className="bg-slate-900 border-violet-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-violet-300">
            The Equation Between License and Mission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <p>
            Kardashev Type I means a civilisation that harnesses all energy available on its
            home planet. That is not possible under a proprietary OS. A planetary energy grid,
            spectral relay mesh, and distributed photonic substrate cannot be owned.
          </p>
          <p>
            AGPL-3.0 is the physics of the licensing layer: just as two photons in orthogonal
            Ψ channels cannot interfere, the open standard and proprietary enclosure cannot
            coexist. Any company that runs NexusOS must, by the license, make their
            implementation available. The planetary OS remains planetary.
          </p>
          <div className="flex items-center gap-2 font-mono text-xs text-violet-400 mt-2">
            <span>Λ = hf/c²</span>
            <ArrowRight className="w-3 h-3" />
            <span>physics is open</span>
            <ArrowRight className="w-3 h-3" />
            <span>AGPL-3.0 enforces this</span>
            <ArrowRight className="w-3 h-3" />
            <span>Kardashev Type I is achievable</span>
          </div>
        </CardContent>
      </Card>

      {/* What contributors get */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">What Contributors Get</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {[
              { who: "Individual developer", gets: "A running AI OS kernel, photonic dev environment, and spectral protocol — today, in the browser.", color: "#10b981" },
              { who: "Hardware company", gets: "A complete OS specification that is ready to boot on photonic hardware the moment it ships. Zero kernel-development cost.", color: "#06b6d4" },
              { who: "Research institution", gets: "A tested, 44-passing-test reference implementation of WNSP, Lambda Boson theory, and the Hilbert-space channel model.", color: "#7c3aed" },
            ].map((item, i) => (
              <div key={i} className="rounded p-3 bg-slate-800 border border-slate-700">
                <p className="font-mono mb-1" style={{ color: item.color }}>{item.who}</p>
                <p className="text-slate-400">{item.gets}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function WavelengthOsManifestoPage() {
  const { data: kernelStatus } = useQuery<any>({
    queryKey: ["/api/kernel/status"],
  });

  const kernelLive = kernelStatus?.boot?.status === "BOOT_COMPLETE";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#06b6d4,#10b981,#f59e0b)",
            }}
          >
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Wavelength OS — The Case
            </h1>
            <p className="text-slate-400 text-sm">
              How to advocate a computing paradigm grounded in electromagnetic physics
            </p>
          </div>
          {kernelLive && (
            <div className="ml-auto flex items-center gap-2 text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400">Kernel live</span>
            </div>
          )}
        </div>

        {/* The one-liner */}
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs">
          <div className="flex flex-wrap gap-2 items-center text-slate-400">
            <span className="text-red-400">Silicon ends at ~2 nm</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-yellow-400">Photons have no barrier</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-cyan-400">Spectrum is the address space</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-violet-400">Λ = hf/c² unifies the stack</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-green-400">OS is already running</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="manifesto">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="manifesto"  data-testid="tab-manifesto">
            <BookOpen className="w-3 h-3 mr-1" /> Manifesto
          </TabsTrigger>
          <TabsTrigger value="industry"   data-testid="tab-industry">
            <Cpu className="w-3 h-3 mr-1" /> Industry
          </TabsTrigger>
          <TabsTrigger value="advocacy"   data-testid="tab-advocacy">
            <Users className="w-3 h-3 mr-1" /> Advocacy
          </TabsTrigger>
          <TabsTrigger value="license"    data-testid="tab-license">
            <Scale className="w-3 h-3 mr-1" /> AGPL-3.0
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manifesto">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">
            The three-pillar argument — physics, addressing, unification
          </h2>
          <ManifestoTab />
        </TabsContent>

        <TabsContent value="industry">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            What each company builds — and what Nexus delivers to them
          </h2>
          <IndustryTab />
        </TabsContent>

        <TabsContent value="advocacy">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Five audiences, five channels, one argument
          </h2>
          <AdvocacyTab />
        </TabsContent>

        <TabsContent value="license">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">
            Why AGPL-3.0 is not a formality — it is the enforcement of the mission
          </h2>
          <LicenseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
