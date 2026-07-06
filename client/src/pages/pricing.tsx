import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check, X, Zap, Server, Cpu, Globe, ChevronRight, ArrowRight,
} from "lucide-react";

// ── Pricing data ──────────────────────────────────────────────────

const API_PLANS = [
  {
    name: "Open",
    price: "$0",
    period: "forever",
    color: "#10b981",
    badge: "AGPL-3.0",
    tagline: "Self-hosted. Full source. No restrictions on the protocol.",
    cta: "Fork on GitHub",
    ctaVariant: "outline" as const,
    features: [
      { text: "Full WNSP protocol source (CE + SE)",           included: true  },
      { text: "51,200-channel Hilbert space specification",    included: true  },
      { text: "AI OS Kernel — all 5 components",              included: true  },
      { text: "Lambda Gate v4 specification",                  included: true  },
      { text: "100 spectral encodes / day (hosted API)",       included: true  },
      { text: "Community Ψ channel pool",                      included: true  },
      { text: "Dedicated Ψ channel reservation",               included: false },
      { text: "Managed kernel (hosted agents)",                included: false },
      { text: "SLA / uptime guarantee",                        included: false },
      { text: "Commercial hardware licence",                   included: false },
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    color: "#06b6d4",
    badge: "MOST POPULAR",
    tagline: "Hosted API with dedicated channels. For builders who need reliability.",
    cta: "Start Pro",
    ctaVariant: "default" as const,
    features: [
      { text: "Everything in Open",                            included: true  },
      { text: "10,000 spectral encodes / day",                 included: true  },
      { text: "10 dedicated Ψ channels reserved",             included: true  },
      { text: "Persistent agent slots (up to 20)",             included: true  },
      { text: "CE Code Writer — unlimited generations",        included: true  },
      { text: "Spectral App Scaffold — unlimited projects",    included: true  },
      { text: "99.5% uptime SLA",                             included: true  },
      { text: "Email support (48h response)",                  included: true  },
      { text: "Managed kernel cluster",                        included: false },
      { text: "Commercial hardware licence",                   included: false },
    ],
  },
  {
    name: "Kernel",
    price: "$499",
    period: "per month",
    color: "#7c3aed",
    badge: "MANAGED",
    tagline: "Fully managed AI OS kernel. Your agents run on the spectral substrate, not your servers.",
    cta: "Deploy Kernel",
    ctaVariant: "default" as const,
    features: [
      { text: "Everything in Pro",                             included: true  },
      { text: "Unlimited spectral encodes",                    included: true  },
      { text: "100 dedicated Ψ channels reserved",            included: true  },
      { text: "Persistent agent slots (unlimited)",            included: true  },
      { text: "Managed kernel cluster (multi-region)",         included: true  },
      { text: "Dead-agent watchdog with auto-recovery",        included: true  },
      { text: "SSE event stream for your agents",              included: true  },
      { text: "99.9% uptime SLA",                             included: true  },
      { text: "Priority support (4h response)",                included: true  },
      { text: "Commercial hardware licence",                   included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "annual contract",
    color: "#f59e0b",
    badge: "HARDWARE",
    tagline: "For hardware companies building on the Lambda Gate substrate. Includes commercial firmware rights.",
    cta: "Contact Us",
    ctaVariant: "outline" as const,
    features: [
      { text: "Everything in Kernel",                          included: true  },
      { text: "Unlimited Ψ channels",                         included: true  },
      { text: "Commercial Lambda Gate licence (InP tape-out)", included: true  },
      { text: "PHR-1 resonator firmware rights",               included: true  },
      { text: "WNSP protocol co-branding rights",              included: true  },
      { text: "Dedicated engineering partnership",             included: true  },
      { text: "White-label kernel for OEM use",                included: true  },
      { text: "Custom authority band allocation",              included: true  },
      { text: "99.99% SLA with hardware-level guarantees",     included: true  },
      { text: "On-site integration support",                   included: true  },
    ],
  },
];

// Usage metering
const USAGE_METRICS = [
  {
    metric: "Spectral Encode",
    unit: "per encode",
    description: "One CE→SE encode call (any instruction length)",
    open: "100/day",
    pro: "10,000/day",
    kernel: "Unlimited",
    enterprise: "Unlimited",
    overage: "$0.001",
    color: "#06b6d4",
  },
  {
    metric: "Ψ Channel Reservation",
    unit: "per channel / month",
    description: "Dedicated orthogonal channel in Hilbert space (not shared pool)",
    open: "0",
    pro: "10",
    kernel: "100",
    enterprise: "Unlimited",
    overage: "$5/channel",
    color: "#7c3aed",
  },
  {
    metric: "Agent Slots",
    unit: "concurrent agents",
    description: "Persistent AI agents registered on the kernel bus",
    open: "0",
    pro: "20",
    kernel: "Unlimited",
    enterprise: "Unlimited",
    overage: "$10/agent",
    color: "#f59e0b",
  },
  {
    metric: "SSE Event Streams",
    unit: "active streams",
    description: "Server-sent event streams for kernel interrupt delivery",
    open: "0",
    pro: "5",
    kernel: "Unlimited",
    enterprise: "Unlimited",
    overage: "$20/stream",
    color: "#10b981",
  },
];

// Hardware partnership tiers
const HARDWARE_TIERS = [
  {
    name: "Evaluation",
    price: "$25,000",
    period: "one-time",
    color: "#06b6d4",
    for: "Research labs, university photonics groups, pre-revenue startups",
    includes: [
      "Lambda Gate v4 full specification (all 8 operators)",
      "PHR-1 resonator schematics and BOM",
      "WNSP firmware reference implementation",
      "NexusOS kernel source with hardware HAL",
      "12-month evaluation window",
      "50 hours engineering support",
    ],
    notIncluded: [
      "Commercial production rights",
      "OEM/white-label rights",
      "Custom authority band allocation",
    ],
  },
  {
    name: "Production",
    price: "$250,000",
    period: "per product line",
    color: "#7c3aed",
    for: "Fabless chip companies, photonic hardware startups, tier-2 OEMs",
    includes: [
      "Everything in Evaluation",
      "Commercial production rights (unlimited units)",
      "NexusOS kernel OEM build for your hardware",
      "Custom authority band allocation for your product",
      "Source Code Reference embedding in your frames",
      "250 hours dedicated engineering support",
      "Co-marketing as NexusOS Certified Hardware",
    ],
    notIncluded: [
      "WNSP co-branding rights",
      "White-label kernel",
    ],
  },
  {
    name: "Strategic Partner",
    price: "Equity + revenue share",
    period: "negotiated",
    color: "#f59e0b",
    for: "Intel, NVIDIA, TSMC, major photonics OEMs — companies building the next generation of photonic hardware at scale",
    includes: [
      "Everything in Production",
      "WNSP protocol co-branding (your name on the standard)",
      "White-label NexusOS kernel",
      "Joint engineering team embedded at your facility",
      "Custom Lambda Gate operator extensions",
      "Equity stake in NexusOS protocol foundation",
      "Founding partner status in the spectral addressing standard",
      "Priority seat on the WNSP standards committee",
    ],
    notIncluded: [],
  },
];

// AGPL economics
const AGPL_POINTS = [
  {
    question: "If the code is free, why pay?",
    answer: "The protocol source is AGPL-3.0. Any company can run it themselves — and must publish their modifications. What they pay for is the managed infrastructure (hosted kernel, reserved Ψ channels, SLA), the commercial hardware firmware rights, and engineering partnership. The license covers the code; the subscription covers the service.",
    color: "#10b981",
    icon: "⚖",
  },
  {
    question: "What if a company forks it and goes proprietary?",
    answer: "They can't. AGPL-3.0 §13 covers network use: if a company runs NexusOS as a service and offers it to users, they must publish all modifications. The Frame Builder v7.1 embeds Source Code References in every photonic frame — any hardware running NexusOS frames carries a cryptographic pointer back to the source. Non-compliance is traceable and enforceable.",
    color: "#ef4444",
    icon: "🔗",
  },
  {
    question: "How does this compare to Red Hat / MongoDB?",
    answer: "Identical model. Red Hat's Linux is free; Red Hat Enterprise Linux support is $1,399/server/year. MongoDB's source is SSPL; MongoDB Atlas is metered SaaS. NexusOS's kernel source is AGPL-3.0; NexusOS Kernel managed hosting is $499/month. The pattern is established and bankable.",
    color: "#06b6d4",
    icon: "📊",
  },
  {
    question: "Why would a hardware company pay for something they could build themselves?",
    answer: "Because building the OS takes longer than building the hardware. Intel has the InP fab capability. They do not have the kernel, the WNSP protocol, the 51,200-channel Hilbert model, the dead-agent watchdog, or the spectral authority system. That took years. The hardware partnership buys a ready OS — so their chip ships with a working kernel from day one.",
    color: "#7c3aed",
    icon: "⚙",
  },
];

// Revenue projections
const PROJECTIONS = [
  { year: "2025", api: 50, kernel: 10, hardware: 1, total: 61, note: "Alpha — 50 Pro developers, 10 Kernel subscribers, 1 Eval hardware" },
  { year: "2026", api: 500, kernel: 80, hardware: 5, total: 585, note: "First hardware eval deals; 500 Pro API users" },
  { year: "2027", api: 2000, kernel: 300, hardware: 20, total: 2320, note: "First production hardware licence; managed kernel growth" },
  { year: "2028", api: 8000, kernel: 1200, hardware: 150, total: 9350, note: "Strategic partner revenue; silicon tunnelling wall approaches" },
  { year: "2029", api: 25000, kernel: 5000, hardware: 2000, total: 32000, note: "Silicon wall reached — photonic OS demand inflects" },
];

// ── Sub-components ────────────────────────────────────────────────

function PlanCard({ plan, i }: { plan: typeof API_PLANS[0]; i: number }) {
  return (
    <div className="flex flex-col rounded-xl border p-5"
      style={{ borderColor: `${plan.color}50`, background: `${plan.color}08` }}
      data-testid={`plan-card-${i}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
            <Badge className="text-xs px-1.5 py-0 font-mono" style={{ background: `${plan.color}30`, color: plan.color, borderColor: `${plan.color}50` }}>
              {plan.badge}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">{plan.tagline}</p>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-slate-100">{plan.price}</span>
        <span className="text-slate-500 text-sm ml-1">/ {plan.period}</span>
      </div>

      <ul className="space-y-2 flex-1 mb-5">
        {plan.features.map((f, j) => (
          <li key={j} className="flex items-start gap-2 text-xs">
            {f.included
              ? <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
              : <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-700" />}
            <span className={f.included ? "text-slate-300" : "text-slate-600"}>{f.text}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={plan.ctaVariant}
        className="w-full"
        style={plan.ctaVariant === "default" ? { background: plan.color, color: "white" } : { borderColor: plan.color, color: plan.color }}
        data-testid={`plan-cta-${i}`}>
        {plan.cta}
        <ChevronRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}

function ApiPlansTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {API_PLANS.map((plan, i) => (
          <PlanCard key={i} plan={plan} i={i} />
        ))}
      </div>

      {/* Usage table */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Usage Limits & Overage</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 py-2 pr-4">Metric</th>
                <th className="text-center text-green-400 py-2 px-3">Open</th>
                <th className="text-center text-cyan-400 py-2 px-3">Pro</th>
                <th className="text-center text-violet-400 py-2 px-3">Kernel</th>
                <th className="text-center text-amber-400 py-2 px-3">Enterprise</th>
                <th className="text-right text-slate-500 py-2 pl-4">Overage</th>
              </tr>
            </thead>
            <tbody>
              {USAGE_METRICS.map((m, i) => (
                <tr key={i} className="border-b border-slate-800" data-testid={`usage-row-${i}`}>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-slate-300">{m.metric}</span>
                    </div>
                    <div className="text-slate-600 text-xs mt-0.5 pl-4">{m.description}</div>
                  </td>
                  <td className="text-center text-green-400 py-2 px-3">{m.open}</td>
                  <td className="text-center text-cyan-400 py-2 px-3">{m.pro}</td>
                  <td className="text-center text-violet-400 py-2 px-3">{m.kernel}</td>
                  <td className="text-center text-amber-400 py-2 px-3">{m.enterprise}</td>
                  <td className="text-right text-slate-500 py-2 pl-4">{m.overage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HardwareTab() {
  return (
    <div className="space-y-5">
      <p className="text-slate-400 text-sm">
        The hardware partnership licences are for companies building photonic
        compute on the Lambda Gate substrate. AGPL-3.0 covers the source —
        the commercial licence covers production rights, firmware integration,
        and the engineering partnership to ship.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {HARDWARE_TIERS.map((tier, i) => (
          <div key={i} className="flex flex-col rounded-xl border p-5"
            style={{ borderColor: `${tier.color}50`, background: `${tier.color}08` }}
            data-testid={`hardware-tier-${i}`}>
            <div className="mb-3">
              <h3 className="font-bold text-slate-100 text-lg">{tier.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{tier.for}</p>
            </div>
            <div className="mb-4">
              <span className="text-2xl font-bold" style={{ color: tier.color }}>{tier.price}</span>
              <span className="text-slate-500 text-sm ml-1">/ {tier.period}</span>
            </div>

            <div className="flex-1 space-y-2 mb-4">
              {tier.includes.map((item, j) => (
                <div key={j} className="flex gap-2 text-xs">
                  <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: tier.color }} />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
              {tier.notIncluded.map((item, j) => (
                <div key={j} className="flex gap-2 text-xs">
                  <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-700" />
                  <span className="text-slate-600">{item}</span>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full"
              style={{ borderColor: `${tier.color}80`, color: tier.color }}
              data-testid={`hardware-cta-${i}`}>
              {i === 2 ? "Open Partnership Discussion" : "Start Evaluation"}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 text-sm text-slate-300 space-y-2">
          <p className="font-semibold text-slate-100">Why does the hardware licence exist at all?</p>
          <p>
            AGPL-3.0 requires that modifications be published when the software is used
            as a service. But a hardware company shipping a chip is not "offering a service" —
            they are distributing a product. The AGPL network use provision does not apply
            to firmware embedded in a device you sell. Therefore, a company could ship
            a Lambda Gate ASIC running NexusOS firmware without publishing modifications.
          </p>
          <p>
            The hardware licence closes this gap. It grants commercial firmware embedding
            rights in exchange for: (1) a financial contribution to development, (2) a
            commitment to contribute improvements back via a separate agreement, and (3)
            NexusOS certification of the hardware as a compatible implementation.
          </p>
          <p className="text-slate-500 text-xs font-mono">
            This is the same mechanism used by the Linux kernel's commercial sublicensing
            for embedded devices.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AgplEconomicsTab() {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        The business model is built on an established pattern — open protocol,
        paid infrastructure, commercial hardware rights. Here is how each
        common objection resolves.
      </p>

      <div className="space-y-3">
        {AGPL_POINTS.map((point, i) => (
          <div key={i} className="rounded-lg border p-4"
            style={{ borderColor: `${point.color}40`, background: `${point.color}08` }}
            data-testid={`agpl-point-${i}`}>
            <div className="flex gap-3">
              <span className="text-xl flex-shrink-0">{point.icon}</span>
              <div>
                <p className="font-semibold text-sm text-slate-100 mb-2">{point.question}</p>
                <p className="text-sm text-slate-300 leading-relaxed">{point.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparable companies */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Comparable Companies & Valuation Anchors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left py-2 pr-4">Company</th>
                  <th className="text-left py-2 pr-4">Model</th>
                  <th className="text-left py-2 pr-4">License</th>
                  <th className="text-right py-2">Outcome</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  { co: "Red Hat",    model: "Enterprise Linux support",    lic: "GPL-2.0",   out: "$34B acquisition (IBM)"   },
                  { co: "MongoDB",    model: "Atlas managed DB hosting",    lic: "SSPL",      out: "$20B+ public company"     },
                  { co: "Elastic",    model: "Elastic Cloud SaaS",          lic: "SSPL",      out: "$10B+ public company"     },
                  { co: "HashiCorp",  model: "Terraform Cloud + Enterprise", lic: "BSL/MPL",  out: "$6.4B acquisition (IBM)"  },
                  { co: "NexusOS",    model: "Kernel SaaS + hardware lic.", lic: "AGPL-3.0",  out: "TBD — first mover, post-silicon" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="py-2 pr-4 font-mono" style={i === 4 ? { color: "#f59e0b" } : {}}>{row.co}</td>
                    <td className="py-2 pr-4 text-slate-400">{row.model}</td>
                    <td className="py-2 pr-4 font-mono text-slate-500">{row.lic}</td>
                    <td className="py-2 text-right" style={i === 4 ? { color: "#f59e0b" } : { color: "#10b981" }}>{row.out}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectionsTab() {
  const maxTotal = Math.max(...PROJECTIONS.map(p => p.total));

  return (
    <div className="space-y-5">
      <p className="text-slate-400 text-sm">
        Revenue projections are grounded in two hard facts: (1) the silicon tunnelling
        wall is an engineering deadline, not a forecast, and (2) when it is reached,
        every compute workload needs an alternative. The inflection in 2029 is physics.
      </p>

      {/* Bar chart */}
      <div className="space-y-2">
        {PROJECTIONS.map((p, i) => (
          <div key={i} data-testid={`projection-${i}`}>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono text-slate-400 w-10">{p.year}</span>
              <div className="flex-1 flex gap-1 items-end h-8">
                {[
                  { val: p.api,      color: "#06b6d4", label: "API"      },
                  { val: p.kernel,   color: "#7c3aed", label: "Kernel"   },
                  { val: p.hardware, color: "#f59e0b", label: "Hardware" },
                ].map((seg, j) => (
                  <div key={j} className="relative flex-shrink-0 rounded-t"
                    style={{
                      height: `${Math.max((seg.val / maxTotal) * 100, 2)}%`,
                      width: `${100 / 4}%`,
                      background: seg.color,
                      opacity: 0.8 + i * 0.04,
                    }}
                    title={`${seg.label}: $${seg.val.toLocaleString()}k`} />
                ))}
              </div>
              <span className="text-xs font-mono text-slate-300 w-20 text-right">
                ${p.total >= 1000 ? `${(p.total / 1000).toFixed(1)}M` : `${p.total}k`}
              </span>
            </div>
            <p className="text-xs text-slate-600 pl-14 ml-3">{p.note}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs font-mono">
        {[
          { label: "API revenue", color: "#06b6d4" },
          { label: "Kernel SaaS", color: "#7c3aed" },
          { label: "Hardware lic.", color: "#f59e0b" },
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
            <span className="text-slate-400">{l.label}</span>
          </div>
        ))}
        <span className="text-slate-600 ml-auto">All figures in USD thousands (k) / millions (M)</span>
      </div>

      {/* Key assumptions */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Key Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-400 space-y-1.5">
          {[
            "API: 20% monthly growth rate from 50 initial Pro subscribers, 10% converting to Kernel tier",
            "Kernel: Average 3-month trial before conversion, 85% annual retention",
            "Hardware: 12-month Evaluation to Production conversion rate 60%; Strategic partner deal by 2028",
            "Silicon wall: TSMC 2 nm production yield crisis triggers demand inflection in 2029",
            "These projections are conservative — they assume zero press coverage and no viral developer adoption",
          ].map((a, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-slate-600 flex-shrink-0">·</span>
              <span>{a}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#10b981,#06b6d4,#7c3aed,#f59e0b)" }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Monetisation</h1>
            <p className="text-slate-400 text-sm">
              Open protocol. Managed infrastructure. Commercial hardware rights.
            </p>
          </div>
        </div>

        {/* Model summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
          {[
            { icon: <Globe className="w-4 h-4" />, title: "Protocol is free", sub: "AGPL-3.0. Fork it, run it, build on it. Modifications must be published.", color: "#10b981" },
            { icon: <Server className="w-4 h-4" />, title: "Infrastructure is paid", sub: "Managed kernel, reserved Ψ channels, SLA, persistent agents.", color: "#06b6d4" },
            { icon: <Cpu className="w-4 h-4" />, title: "Hardware rights are licensed", sub: "Commercial firmware embedding for Lambda Gate / PHR-1 chips.", color: "#f59e0b" },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border border-slate-700 bg-slate-900/60"
              data-testid={`model-pillar-${i}`}>
              <div style={{ color: item.color }} className="mt-0.5 flex-shrink-0">{item.icon}</div>
              <div>
                <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 px-1">
          <span>Same model as</span>
          <ArrowRight className="w-3 h-3" />
          <span className="text-red-400">Red Hat</span>
          <span className="text-slate-700">/</span>
          <span className="text-green-400">MongoDB</span>
          <span className="text-slate-700">/</span>
          <span className="text-yellow-400">HashiCorp</span>
          <span className="text-slate-700">—</span>
          <span className="text-slate-500">proven at acquisition scale</span>
        </div>
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="plans"       data-testid="tab-plans">
            <Zap className="w-3 h-3 mr-1" /> API Plans
          </TabsTrigger>
          <TabsTrigger value="hardware"    data-testid="tab-hardware">
            <Cpu className="w-3 h-3 mr-1" /> Hardware
          </TabsTrigger>
          <TabsTrigger value="economics"   data-testid="tab-economics">
            <Globe className="w-3 h-3 mr-1" /> AGPL Economics
          </TabsTrigger>
          <TabsTrigger value="projections" data-testid="tab-projections">
            <Server className="w-3 h-3 mr-1" /> Projections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Developer API — from free self-hosted to fully managed kernel
          </h2>
          <ApiPlansTab />
        </TabsContent>

        <TabsContent value="hardware">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">
            Hardware partnership — Evaluation → Production → Strategic
          </h2>
          <HardwareTab />
        </TabsContent>

        <TabsContent value="economics">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            How AGPL-3.0 and revenue coexist — every objection answered
          </h2>
          <AgplEconomicsTab />
        </TabsContent>

        <TabsContent value="projections">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">
            Revenue projections — grounded in the silicon wall timeline
          </h2>
          <ProjectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
