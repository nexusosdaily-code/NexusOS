import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Radio, Zap, Cpu, Globe, Shield, Code2, BookOpen,
  ArrowRight, Check, ExternalLink, Layers, Activity,
  Waves, Lock, Star, Users, ChevronDown, ChevronUp,
  TrendingUp, Briefcase, Award, Scale
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

function SpectrumBar() {
  return (
    <div className="w-full h-3 rounded-full overflow-hidden" style={{
      background: "linear-gradient(to right, #7f00ff, #4400ff, #0000ff, #00aaff, #00ffaa, #aaff00, #ffff00, #ffaa00, #ff5500, #ff0000)"
    }} />
  );
}

export default function CrowdfundPage() {
  const { data: eco } = useQuery<any>({ queryKey: ["/api/ecosystem/status"], retry: false });
  const { data: chain } = useQuery<any>({ queryKey: ["/api/blockchain/chain"], retry: false });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      a: "100% of R&D funding goes to communication hardware development: the PHR-1 resonator prototype, 144-turn bifilar coil manufacturing, Syncbox Controller firmware, ZERO-G state testing, and the Spectral Relay Mesh network nodes. The Orbital Treasury distributes funds across 5 buckets: 35% maintenance, 25% deliverables, 20% research, 10% agent rewards, 10% Nexus Charitable Trust.",
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
      a: "PHR-1 is the first physical resonator implementing the ZERO-G state — gravitational de-correlation through phase alignment of a 144-turn bifilar coil. It is the first hardware layer of the Lambda Gate Substrate. Hardware Founders receive a unit in the first production batch of 25.",
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
        <Link href="/">
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
                <div className="text-xl font-bold mb-0.5">{tier.nxt}</div>
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
                <Link href="/wallet">
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
      </section>
    </div>
  );
}
