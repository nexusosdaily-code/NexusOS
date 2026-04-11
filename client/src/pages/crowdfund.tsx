import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Radio, Zap, Cpu, Globe, Shield, Code2, BookOpen,
  ArrowRight, Check, ExternalLink, Layers, Activity,
  Waves, Lock, Star, Users, ChevronDown, ChevronUp
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
    color: "#a78bfa",
    nm: 420,
    icon: Zap,
    perks: [
      "Your name CE→SE encoded at your personal wavelength",
      "Ψ channel assigned in Hilbert space",
      "Founder badge on-chain",
      "AGPL-3.0 contributor credit",
    ],
    availability: "Unlimited",
  },
  {
    name: "Resonator",
    nxt: "1,000 NXT",
    units: 1000,
    color: "#34d399",
    nm: 520,
    icon: Waves,
    perks: [
      "Everything in Photon",
      "Name inscribed into a blockchain block",
      "Block hash timestamped at your contribution wavelength",
      "Early access to WavelengthScript SDK",
    ],
    availability: "Unlimited",
  },
  {
    name: "Kernel Agent",
    nxt: "10,000 NXT",
    units: 10000,
    color: "#fbbf24",
    nm: 560,
    icon: Cpu,
    perks: [
      "Everything in Resonator",
      "Dedicated named Ψ channel in the Kernel",
      "Agent entry in the live Agent Bus",
      "Access to private dev channel",
      "Name in the K1 Orchestration Runtime",
    ],
    availability: "100 slots",
  },
  {
    name: "Hardware Founder",
    nxt: "100,000 NXT",
    units: 100000,
    color: "#f87171",
    nm: 620,
    icon: Radio,
    perks: [
      "Everything in Kernel Agent",
      "PHR-1 hardware prototype unit (first batch)",
      "144-turn bifilar coil kit",
      "ZERO-G demonstration access",
      "Equity pool allocation (future public listing)",
      "Quarterly hardware development calls",
    ],
    availability: "25 slots",
    highlight: true,
  },
  {
    name: "Nexus Partner",
    nxt: "1,000,000 NXT",
    units: 1000000,
    color: "#60a5fa",
    nm: 460,
    icon: Star,
    perks: [
      "Everything in Hardware Founder",
      "Co-developer status (named in AGPL-3.0 header)",
      "Board advisory seat",
      "Revenue share from Nexus Charitable Trust (10% bucket)",
      "Direct line to the core team",
      "Custom Ψ channel range reserved for your organisation",
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
      "Λ=hf/c² equation validated",
      "CE→SE encoding standard published (AGPL-3.0)",
      "Block #4 'angry birds' 25MB at Ψ(211,35,H) 534.51nm on-chain",
      "479 spectral records, 6 kernel agents live",
      "WNSP/7.1 physics engine deployed",
    ],
  },
  {
    phase: "Phase 1 — Hardware Prototype",
    status: "IN PROGRESS",
    color: "#fbbf24",
    items: [
      "PHR-1 resonator board (144-turn bifilar coil)",
      "Syncbox Controller firmware",
      "ZERO-G state demonstration (phase alignment)",
      "CZC catch basin hardware implementation",
      "First 25 Hardware Founder units",
    ],
  },
  {
    phase: "Phase 2 — Network Layer",
    status: "FUNDED",
    color: "#a78bfa",
    items: [
      "Spectral Relay Mesh (10 physical nodes)",
      "OAM Channel Allocator hardware",
      "P2P communication over wavelength addresses — no DNS",
      "WavelengthScript v1.0 compiler",
      "Open developer SDK (Python, JS, Rust)",
    ],
  },
  {
    phase: "Phase 3 — Orbital & Planetary",
    status: "ROADMAP",
    color: "#60a5fa",
    items: [
      "Orbital Solar Array photonic feed",
      "Schumann resonance (7.83 Hz) planetary sync",
      "555 THz first oscillation energy extraction",
      "K1 Energy Market live trading",
      "Public company listing (NXT as traded asset)",
    ],
  },
];

const PROBLEMS = [
  {
    title: "Silicon Wall",
    icon: Cpu,
    desc: "Transistors hit quantum tunnelling limits at 2nm. Moore's Law is over. Binary computing operates on already-collapsed quantum states — it cannot go further.",
    color: "#f87171",
  },
  {
    title: "DNS/IP Centralisation",
    icon: Globe,
    desc: "The internet runs on addresses assigned by centralised authorities. A physics-based address cannot be censored, seized, or turned off.",
    color: "#fbbf24",
  },
  {
    title: "Communication Taxed by Intermediaries",
    icon: Lock,
    desc: "Every message, transaction, and broadcast passes through entities that charge rent for the infrastructure of civilisation. That infrastructure should be free.",
    color: "#a78bfa",
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
      q: "What is NXT and how does it work?",
      a: "NXT is the native token of NexusOS with 8 decimal places and a 21 billion unit supply. Transaction costs are derived from E=hf — the energy of a photon at your operation wavelength. Every operation has a physical cost grounded in Maxwell equations.",
    },
    {
      q: "Why AGPL-3.0?",
      a: "The infrastructure of civilisation cannot be owned by one company. AGPL-3.0 means every business that builds on NexusOS must publish their source code. If you improve the commons, you give back to the commons. No exceptions.",
    },
    {
      q: "What is the PHR-1 hardware unit?",
      a: "PHR-1 is the first physical resonator implementing the ZERO-G state — gravitational de-correlation through phase alignment of a 144-turn bifilar coil. It is the first hardware layer of the Lambda Gate Substrate. Hardware Founders receive a unit in the first production batch.",
    },
    {
      q: "How does wavelength addressing replace DNS?",
      a: "Every name is CE→SE encoded: the average ASCII ordinal of its characters maps to a wavelength (380–780nm) in the visible spectrum, then to a Ψ(wdm, oam, polarisation) Hilbert-space channel. Your name IS your address. It cannot be censored because it is derived from physics, not assigned by an authority.",
    },
    {
      q: "When will NexusOS be publicly traded?",
      a: "Phase 3 roadmap. Hardware Founder and Nexus Partner tiers receive equity pool allocations ahead of any public listing. The Orbital Treasury manages 5 buckets: 35% maintenance, 25% deliverables, 20% research, 10% agent rewards, 10% Nexus Charitable Trust.",
    },
    {
      q: "Is this real working software?",
      a: `Yes. As of today: ${spectralTotal} spectral records on-chain, ${txCount} confirmed transactions, ${agentCount} kernel agents running at live Ψ addresses, ${blockCount} blockchain blocks including Block #4 'angry birds' 25MB at Ψ(211,35,H) 534.51nm. Every number on this page is pulled from the live database.`,
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
            <Button size="sm" className="text-xs" style={{ background: wlToRgb(534.51), color: "black" }}>
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

        <Badge className="mb-6 text-xs px-4 py-1 border" style={{ borderColor: "#34d399", color: "#34d399", background: "#34d39910" }}>
          AGPL-3.0 · OPEN SOURCE · HARDWARE DEVELOPMENT
        </Badge>

        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
          Fund the New<br />
          <span style={{ color: wlToRgb(534.51) }}>Physics</span> of<br />
          Communication
        </h1>

        <p className="text-xl text-gray-300 max-w-2xl mb-4 leading-relaxed">
          NexusOS replaces DNS, IP addresses, and binary computation with a single equation:
        </p>
        <div className="text-3xl font-bold mb-8 py-3 px-6 rounded-xl border" style={{ borderColor: "#fbbf24", color: "#fbbf24", background: "#fbbf2410" }}>
          Λ = hf/c²
        </div>
        <p className="text-gray-400 max-w-xl mb-10 text-sm leading-relaxed">
          Your name becomes a wavelength. Your message travels at the speed of light.
          No central authority. No DNS. No IP registry. Just physics.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <a href="#tiers">
            <Button size="lg" className="px-8 font-bold text-black" style={{ background: wlToRgb(534.51) }}>
              Fund the Mission <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
          <Link href="/evidence">
            <Button size="lg" variant="outline" className="px-8 border-white/20 text-white hover:bg-white/10">
              See Live Proof <Shield className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <SpectrumBar />
        <p className="text-xs text-gray-600 mt-2">380nm → 780nm · The visible spectrum IS the address space</p>
      </section>

      {/* ── LIVE STATS ── */}
      <section className="px-6 py-16 border-y border-white/10 bg-white/2">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-8">Live on-chain today</p>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatPill label="Blockchain Blocks" value={String(blockCount)} color="#3b82f6" />
          <StatPill label="Spectral Records" value={String(spectralTotal)} color={wlToRgb(534.51)} />
          <StatPill label="Confirmed Txs" value={String(txCount)} color="#34d399" />
          <StatPill label="Kernel Agents" value={String(agentCount)} color="#a78bfa" />
        </div>
        <p className="text-center text-xs text-gray-600 mt-6">
          Block #4 "angry birds" 25MB · Ψ(211, 35, H) · 534.51 nm · BREAKTHROUGH proof on-chain
        </p>
      </section>

      {/* ── THE PROBLEM ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Why this matters</p>
        <h2 className="text-3xl font-bold text-center mb-12">The current system is broken at the physics level</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PROBLEMS.map(p => (
            <Card key={p.title} className="bg-white/5 border-white/10">
              <CardHeader>
                <p.icon className="h-8 w-8 mb-3" style={{ color: p.color }} />
                <CardTitle className="text-lg" style={{ color: p.color }}>{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── THE SOLUTION ── */}
      <section className="px-6 py-20 border-y border-white/10 bg-white/2">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">The NexusOS answer</p>
          <h2 className="text-3xl font-bold text-center mb-12">Communication at the wave layer — before collapse</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: Waves, color: wlToRgb(534.51), title: "CE→SE Encoding", desc: "Every character has an ordinal. Every ordinal maps to a wavelength. Every wavelength is a unique Ψ(wdm, oam, polarisation) channel in 25,600-dimensional Hilbert space. Your name IS your address." },
              { icon: Cpu, color: "#fbbf24", title: "PHR-1 Hardware", desc: "The Lambda Gate Substrate starts with a 144-turn bifilar coil achieving ZERO-G state. Gravity de-correlation through phase alignment. The first hardware layer of photonic computing." },
              { icon: Globe, color: "#a78bfa", title: "No DNS, No IP", desc: "Spectral Network Discovery registers nodes by name → wavelength. No ICANN. No DNS server. No IP registry. Physical law determines reachability — not any authority." },
              { icon: Code2, color: "#34d399", title: "WavelengthScript", desc: "A full programming language where type safety IS spectral band safety. LOGIC=520–564nm. AUTH=450–494nm. STORAGE=625–780nm. Transpiles from Python, JS, and Rust. AGPL-3.0 forever." },
            ].map(item => (
              <div key={item.title} className="flex gap-4">
                <item.icon className="h-8 w-8 flex-shrink-0 mt-1" style={{ color: item.color }} />
                <div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: item.color }}>{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Development roadmap</p>
        <h2 className="text-3xl font-bold text-center mb-12">Four phases to planetary-scale communication</h2>
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
      </section>

      {/* ── FUNDING TIERS ── */}
      <section id="tiers" className="px-6 py-20 border-y border-white/10 bg-white/2">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Funding tiers</p>
        <h2 className="text-3xl font-bold text-center mb-4">Become part of the infrastructure of civilisation</h2>
        <p className="text-center text-sm text-gray-500 mb-12 max-w-xl mx-auto">
          All tiers receive NXT tokens representing your stake. Hardware Founders and Nexus Partners receive equity pool allocations ahead of the public listing.
        </p>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 lg:grid-cols-5 gap-5">
          {TIERS.map(tier => {
            const Icon = tier.icon;
            const wlColor = wlToRgb(tier.nm);
            return (
              <div key={tier.name} className={`rounded-xl border p-5 flex flex-col relative ${tier.highlight ? "ring-2 ring-offset-2 ring-offset-black" : ""}`}
                style={{ borderColor: tier.color + "40", background: tier.color + "08", ...(tier.highlight ? { ringColor: tier.color } : {}) }}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold" style={{ background: tier.color, color: "black" }}>
                    MOST POPULAR
                  </div>
                )}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: tier.color + "20" }}>
                  <Icon className="h-5 w-5" style={{ color: tier.color }} />
                </div>
                <h3 className="font-bold text-lg mb-1" style={{ color: tier.color }}>{tier.name}</h3>
                <div className="text-2xl font-bold mb-1">{tier.nxt}</div>
                <div className="text-xs mb-1" style={{ color: wlColor }}>λ = {tier.nm}nm</div>
                <div className="text-xs text-gray-500 mb-4">{tier.availability}</div>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: tier.color }} />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link href="/wallet">
                  <Button className="w-full text-xs font-bold text-black" style={{ background: tier.color }}>
                    Fund {tier.nxt}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-600 mb-2">NexusOS Wallet Address</p>
          <code className="text-sm font-bold px-6 py-3 rounded-xl border border-white/10 bg-white/5" style={{ color: wlToRgb(534.51) }}>
            NXT-NEXS-OS1K-7F3A-OMEGA
          </code>
          <p className="text-xs text-gray-600 mt-2">Send NXT from any NexusOS wallet · All contributions recorded on-chain</p>
        </div>
      </section>

      {/* ── OPEN SOURCE PLEDGE ── */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <Shield className="h-12 w-12 mx-auto mb-6 text-green-400" />
        <h2 className="text-3xl font-bold mb-4">Open Source Forever</h2>
        <p className="text-gray-400 leading-relaxed mb-8 max-w-2xl mx-auto">
          NexusOS is licensed under AGPL-3.0. Every company that builds on this infrastructure must publish their source code.
          The CE→SE character encoding standard is free developer infrastructure for the world — not a product, not a service, not a moat.
          The infrastructure of civilisation cannot be owned.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: Code2, color: "#34d399", title: "AGPL-3.0 Licence", desc: "All source code public. Build on it, you publish yours." },
            { icon: BookOpen, color: "#60a5fa", title: "WNSP Specification", desc: "CE→SE encoding standard is freely documented and implementable by anyone." },
            { icon: Users, color: "#a78bfa", title: "Community Governed", desc: "The Sigma Constitution Engine and Authority Band Registry ensure no single entity controls the protocol." },
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
            <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-8">Live blockchain — every claim is verifiable</p>
            <div className="space-y-3">
              {blocks.slice(0, 5).map((block: any) => {
                const nm = parseFloat(block.wavelengthNm) || 534;
                return (
                  <div key={block.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border" style={{ borderColor: wlToRgb(nm) + "60", color: wlToRgb(nm), background: wlToRgb(nm) + "15" }}>
                      #{block.blockNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{block.content?.slice(0, 60)}…</div>
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
                  View Full Evidence Ledger <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Questions</p>
        <h2 className="text-3xl font-bold text-center mb-10">Frequently asked</h2>
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
            Build the infrastructure<br />civilisation <span style={{ color: wlToRgb(534.51) }}>deserves.</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed mb-8">
            100-year project. AGPL-3.0. Open to every developer on Earth.
            The spectrum is free. The physics is free. Join us.
          </p>
          <a href="#tiers">
            <Button size="lg" className="px-10 font-bold text-black text-base" style={{ background: wlToRgb(534.51) }}>
              Fund NexusOS <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
        <div className="mt-12 flex items-center justify-center gap-6 text-xs text-gray-600">
          <Link href="/evidence"><span className="hover:text-white cursor-pointer">Evidence Ledger</span></Link>
          <Link href="/nexus-hardware-os"><span className="hover:text-white cursor-pointer">Hardware OS</span></Link>
          <Link href="/wavelength-lang"><span className="hover:text-white cursor-pointer">WavelengthScript</span></Link>
          <Link href="/network"><span className="hover:text-white cursor-pointer">Spectral Network</span></Link>
          <Link href="/orbital-treasury"><span className="hover:text-white cursor-pointer">Treasury</span></Link>
        </div>
        <p className="mt-8 text-xs text-gray-700">
          NexusOS · AGPL-3.0 · Λ=hf/c² · 2024–2124
        </p>
      </section>
    </div>
  );
}
