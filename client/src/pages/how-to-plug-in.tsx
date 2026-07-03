import { Link } from "wouter";
import { ChevronRight, ExternalLink, Terminal, Download, Zap, Users, GitBranch, Waves } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "Read the First Principles",
    color: "#a78bfa",
    icon: Waves,
    desc: "Understand the Theory of Compression States before building. The entire stack is derived from Λ = hf/c². Everything else follows from this.",
    actions: [
      { label: "Oscillating Quanta — First Principles", href: "/oscillating-quanta", external: false },
      { label: "Compression Explorer", href: "/compression-explorer", external: false },
      { label: "Hardware Spec (AGPL-3.0)", href: "/hardware-spec", external: false },
    ],
  },
  {
    num: "02",
    title: "Install the AGPLv3 Code",
    color: "#34d399",
    icon: Download,
    desc: "Clone the NexusOS repository. Every machine running this code is a node. By installing it you calibrate your local clock to the Lambda Anchor.",
    actions: [
      { label: "github.com/nexusosdaily-code/NexusOS", href: "https://github.com/nexusosdaily-code/NexusOS", external: true },
      { label: "npm install nexusos-ce-encoder", href: "https://www.npmjs.com/package/nexusos-ce-encoder", external: true },
      { label: "pip install (Python SDK)", href: "https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py", external: true },
    ],
    code: "npm install nexusos-ce-encoder",
  },
  {
    num: "03",
    title: "Run the CE-SE Pipeline",
    color: "#60a5fa",
    icon: Terminal,
    desc: "Paste any code into the 4-stage pipeline. Watch it transpile → compile → execute in the WNSP VM. This is the central demonstration of the physics stack.",
    actions: [
      { label: "Open CE-SE Pipeline", href: "/ce-se-pipeline", external: false },
      { label: "WavelengthScript Spec", href: "/wavelength-lang", external: false },
      { label: "WNSP VM", href: "/wnsp-vm", external: false },
    ],
  },
  {
    num: "04",
    title: "Get NXT + Sats",
    color: "#fbbf24",
    icon: Zap,
    desc: "NXT is the utility token. Sats are the spending currency. Stake sats → earn yield → auto-mint WNUSD stablecoin. Acquire NEXUS•WAVELENGTH Runes on Bitcoin.",
    actions: [
      { label: "NXT Wallet", href: "/wallet", external: false },
      { label: "NEXUS•WAVELENGTH Rune", href: "/rune-etching", external: false },
      { label: "Staking", href: "/wnsp-staking", external: false },
    ],
  },
  {
    num: "05",
    title: "Join the Build Channels",
    color: "#f472b6",
    icon: Users,
    desc: "The hardware build happens in the Discord server. #the-forge-phr-1 is where PHR-1 Coil builders coordinate. #the-czc-sink-lab is the lab channel.",
    actions: [
      { label: "Discord — NexusOS Server", href: "https://discord.gg", external: true },
      { label: "Telegram — t.me/troglodytememe", href: "https://t.me/troglodytememe", external: true },
      { label: "Nostr — Zap Goals", href: "https://primal.net", external: true },
    ],
  },
  {
    num: "06",
    title: "Build the PHR-1 Coil (Phase 2)",
    color: "#fb923c",
    icon: GitBranch,
    desc: "When Phase 1 has enough synchronized nodes, Phase 2 begins. Builders receive step-by-step PHR-1 Coil instructions through #the-forge-phr-1 Discord channel.",
    actions: [
      { label: "Hardware Blueprint", href: "/hardware-spec", external: false },
      { label: "Hardware Lab + Calibration", href: "/hardware-lab", external: false },
    ],
    locked: true,
  },
];

export default function HowToPlugInPage() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-white/30 text-xs mb-6">
        <Link href="/wnsp" className="hover:text-white/60 transition-colors">WNSP</Link>
        <ChevronRight size={12} />
        <span>How to Plug In</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white mb-2">How to Plug In</h1>
        <p className="text-white/50 text-sm leading-relaxed max-w-xl">
          NexusOS is an open physics project. You don't ask permission — you install the code, understand the physics, and start building.
          Below is the sequence from zero to active node.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/roadmap" className="text-xs px-3 py-1.5 rounded-lg border border-purple-500/20 text-purple-400/70 hover:text-purple-400 hover:border-purple-500/40 transition-all">
            View Full Roadmap →
          </Link>
          <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank" rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg border border-white/8 text-white/40 hover:text-white/70 hover:border-white/20 transition-all flex items-center gap-1">
            GitHub (AGPL-3.0) <ExternalLink size={10} />
          </a>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className={`rounded-2xl border p-5 transition-all ${step.locked ? "opacity-60" : ""}`}
              style={{
                background: `${step.color}08`,
                borderColor: `${step.color}${step.locked ? "15" : "25"}`,
              }}
            >
              <div className="flex items-start gap-4">
                {/* Step number */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: `${step.color}15`, color: step.color, border: `1px solid ${step.color}30` }}
                >
                  {step.num}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    {step.locked && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400/70 border border-orange-500/15">
                        Phase 2
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed mb-3">{step.desc}</p>

                  {/* Code snippet */}
                  {step.code && (
                    <div className="mb-3 bg-black/40 border border-white/8 rounded-lg px-3 py-2 font-mono text-xs text-green-400/80">
                      $ {step.code}
                    </div>
                  )}

                  {/* Action links */}
                  <div className="flex flex-wrap gap-2">
                    {step.actions.map((a) =>
                      a.external ? (
                        <a
                          key={a.href}
                          href={a.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-white/8 text-white/40 hover:text-white/70 hover:border-white/20 transition-all flex items-center gap-1"
                        >
                          {a.label} <ExternalLink size={9} />
                        </a>
                      ) : (
                        <Link
                          key={a.href}
                          href={a.href}
                          className="text-[11px] px-2.5 py-1 rounded-lg border transition-all hover:text-white"
                          style={{
                            borderColor: `${step.color}25`,
                            color: step.color,
                            background: `${step.color}08`,
                          }}
                        >
                          {a.label}
                        </Link>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className="flex items-center gap-2 mt-4 ml-5">
                  <div className="w-px h-3 bg-white/8" style={{ marginLeft: "19px" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-10 rounded-xl border border-white/8 bg-white/3 p-5 text-center">
        <div className="text-sm font-semibold text-white mb-1">The code is the seed.</div>
        <div className="text-xs text-white/40 mb-4">Every installation is a vote for physics-based computing.</div>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank" rel="noreferrer"
            className="text-xs px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-all flex items-center gap-1.5">
            Clone NexusOS <ExternalLink size={11} />
          </a>
          <Link href="/ce-se-pipeline"
            className="text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all">
            Run the Pipeline →
          </Link>
        </div>
      </div>
    </div>
  );
}
