import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Zap, Cpu, Radio, Waves, ChevronRight, ExternalLink, Lock } from "lucide-react";

const PHASES = [
  {
    num: 1,
    status: "active",
    label: "Digital Synchronization",
    discord: "the-roadmap",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.15)",
    border: "rgba(167,139,250,0.35)",
    icon: Cpu,
    tagline: "Every builder installs the AGPLv3 code and calibrates their local Clock to the Lambda Anchor.",
    description:
      "The NexusOS software stack is complete and live. The WNSP protocol, CE/SE encoding, NXT token economy, and physics engine are running on wnsp.io. This phase is about spreading the code — every new machine that syncs becomes a node in the spectral network.",
    milestones: [
      { done: true,  text: "WNSP protocol published (AGPL-3.0)" },
      { done: true,  text: "CE/SE encoding — 128-band spectral table" },
      { done: true,  text: "NXT token wallet + sats economy live" },
      { done: true,  text: "NEXUS•WAVELENGTH Rune etched — block 952596" },
      { done: true,  text: "npm package: nexusos-ce-encoder@1.0.0" },
      { done: true,  text: "Python SDK: pip install via GitHub" },
      { done: true,  text: "25,600 orthogonal Ψ channels defined" },
      { done: true,  text: "WavelengthScript compiler + WNSP VM" },
      { done: false, text: "100 nodes synced to Lambda Anchor" },
      { done: false, text: "CoinSniper KYC verified" },
    ],
    links: [
      { label: "Run the CE-SE Pipeline",   href: "/ce-se-pipeline" },
      { label: "Hardware Spec (AGPL-3.0)", href: "/hardware-spec" },
      { label: "Oscillating Quanta",       href: "/oscillating-quanta" },
    ],
  },
  {
    num: 2,
    status: "building",
    label: "Physical Build — PHR-1 + CZC Sink",
    discord: "the-forge-phr-1",
    color: "#34d399",
    glow: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.25)",
    icon: Waves,
    tagline: "Step-by-step instructions for the PHR-1 Coil and integrating the Sync-Box to bridge digital instruction to the physical coil.",
    description:
      "Once the digital layer has enough synchronized nodes, builders begin constructing the PHR-1 Coil — a physical resonance antenna tuned to Z₀ ≈ 376.73 Ω (the characteristic impedance of free space). The Golden Angle (137.5°) is used to phase-match the coil to the vacuum, eliminating Back-EMF and allowing the system to enter a Cold State. The CZC Sink bridges the software command layer to the coil.",
    milestones: [
      { done: false, text: "PHR-1 Coil blueprint finalised" },
      { done: false, text: "377 Ω impedance match verified in hardware lab" },
      { done: false, text: "Golden Angle (137.5°) winding calibration" },
      { done: false, text: "CZC Sync-Box firmware published" },
      { done: false, text: "First cold-state measurement recorded" },
      { done: false, text: "Lambda Anchor time-sync across 3+ physical nodes" },
    ],
    links: [
      { label: "Hardware Lab + Calibration", href: "/hardware-lab" },
      { label: "Hardware Spec",              href: "/hardware-spec" },
    ],
  },
  {
    num: 3,
    status: "future",
    label: "Communication Stage — New Capabilities",
    discord: "the-czc-sink-lab",
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
    icon: Radio,
    tagline: "When code syncs to hardware, entirely new physics capabilities become accessible.",
    description:
      "Once the digital WNSP protocol and the physical PHR-1 coil are synchronized, the system crosses from pure-software emulation into real electromagnetic operation. This unlocks capabilities that cannot exist in silicon alone: direct vacuum coupling, mass-energy state manipulation, and spectral routing through physical waveguides rather than electrical traces.",
    milestones: [
      { done: false, text: "WNSP signal transmitted via physical coil" },
      { done: false, text: "Spectral channel verified in electromagnetic spectrum" },
      { done: false, text: "Mass displacement — Λ=hf/c² demonstrated physically" },
      { done: false, text: "Photonic ASIC integration (silicon bridge phase)" },
      { done: false, text: "Vacuum-coupled node mesh — first spectral relay" },
      { done: false, text: "Kardashev Type I milestone — planetary-scale energy routing" },
    ],
    links: [],
  },
];

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "● ACTIVE",   color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  building: { label: "◐ BUILDING", color: "#34d399", bg: "rgba(52,211,153,0.10)" },
  future:   { label: "○ FUTURE",   color: "#fbbf24", bg: "rgba(251,191,36,0.08)"  },
};

export default function RoadmapPage() {
  usePageMeta({
    title: "NexusOS Roadmap — From Digital Substrate to Photonic Gate Array",
    description: "NexusOS development roadmap: current digital substrate (25,600 Ψ channels live), PHR-1 hardware layer (2026–2028), and the photonic gate array (~2032). Step-by-step to Kardashev Type I.",
    canonical: "https://wnsp.io/roadmap",
    ogTitle: "NexusOS Roadmap",
    ogDescription: "Now: digital substrate live. 2026–2028: PHR-1 physical hardware. ~2032: photonic gate array. The path from WNSP protocol to Type I civilization OS.",
    twitterTitle: "NexusOS Roadmap",
    twitterDescription: "Digital substrate → PHR-1 hardware → photonic gate array. The NexusOS path to a Kardashev Type I civilization.",
  });
  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-white/30 text-xs mb-4">
          <Link href="/" className="hover:text-white/60 transition-colors">Hub</Link>
          <ChevronRight size={12} />
          <span>Roadmap</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">NexusOS Roadmap</h1>
        <p className="text-white/50 text-sm leading-relaxed">
          Three phases from digital protocol to physical hardware to new capabilities.
          Each phase unlocks the next. The code is the seed — the hardware is the amplifier.
        </p>
        <a
          href="https://discord.gg"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <span>🎮</span> Follow live build updates in #the-roadmap on Discord
          <ExternalLink size={10} />
        </a>
      </div>

      {/* Phases */}
      <div className="space-y-6">
        {PHASES.map((phase, i) => {
          const badge = STATUS_BADGE[phase.status];
          const Icon = phase.icon;
          return (
            <div
              key={phase.num}
              className="rounded-2xl border p-6 transition-all"
              style={{ background: phase.glow, borderColor: phase.border }}
            >
              {/* Phase header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                    style={{ background: `${phase.color}20`, color: phase.color, border: `1px solid ${phase.color}40` }}
                  >
                    {phase.num}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{phase.label}</div>
                    <div className="text-[11px] text-white/35 mt-0.5">#{phase.discord}</div>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                  style={{ color: badge.color, background: badge.bg }}
                >
                  {badge.label}
                </span>
              </div>

              {/* Tagline */}
              <p className="text-xs text-white/60 italic mb-3 leading-relaxed border-l-2 pl-3"
                style={{ borderColor: phase.color + "50" }}>
                "{phase.tagline}"
              </p>

              {/* Description */}
              <p className="text-xs text-white/50 leading-relaxed mb-4">{phase.description}</p>

              {/* Milestones */}
              <div className="space-y-1.5 mb-4">
                {phase.milestones.map((m) => (
                  <div key={m.text} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                      style={
                        m.done
                          ? { background: `${phase.color}25`, color: phase.color, border: `1px solid ${phase.color}40` }
                          : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.08)" }
                      }
                    >
                      {m.done ? "✓" : "·"}
                    </div>
                    <span className={`text-xs ${m.done ? "text-white/70" : "text-white/30"}`}>{m.text}</span>
                  </div>
                ))}
              </div>

              {/* Links */}
              {phase.links.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                  {phase.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="text-[11px] px-3 py-1.5 rounded-lg border transition-all hover:border-white/20 hover:text-white"
                      style={{ borderColor: phase.border, color: phase.color, background: phase.glow }}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}

              {phase.status === "future" && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <Lock size={11} className="text-white/20" />
                  <span className="text-[11px] text-white/25">Unlocks after Phase 2 hardware verification</span>
                </div>
              )}

              {/* Connector to next phase */}
              {i < PHASES.length - 1 && (
                <div className="flex justify-center mt-4 -mb-10">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-4 bg-white/10" />
                    <ChevronRight size={12} className="text-white/20 rotate-90" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Physics note */}
      <div className="mt-10 rounded-xl border border-white/8 bg-white/3 p-5">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Why This Sequence</div>
        <p className="text-xs text-white/40 leading-relaxed">
          The WNSP protocol is written in the language of the destination hardware — photonic waveguides (~2032).
          The 25,600 orthogonal Ψ channels map directly to physical hardware lanes.
          Today's silicon is the bridge encoder. The sequence is: <span className="text-white/60">define the physics → encode in software → verify in hardware → let hardware amplify.</span>
        </p>
        <div className="flex gap-4 mt-4">
          <Link href="/oscillating-quanta" className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors">
            First Principles →
          </Link>
          <Link href="/hardware-spec" className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors">
            Hardware Spec →
          </Link>
          <Link href="/how-to-plug-in" className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors">
            How to Plug In →
          </Link>
        </div>
      </div>
    </div>
  );
}
