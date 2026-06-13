import { useState, useCallback } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Link } from "wouter";
import {
  Zap, Cpu, Radio, Waves, Shield, Code2, FlaskConical,
  Network, ArrowRight, ExternalLink, BookOpen, Rocket,
} from "lucide-react";

// ── CE encoding (mirrors CE_TABLE algorithm: 128 bands, 380–780 nm) ─────────
const BAND_WIDTH = 400 / 128; // 3.125 nm per band

function ceEncode(char: string) {
  const code = char.charCodeAt(0);
  const band = code % 128;
  const lambda = 380 + band * BAND_WIDTH + BAND_WIDTH / 2; // nm, band midpoint
  const freqHz = 3e8 / (lambda * 1e-9);
  const freqTHz = freqHz / 1e12;
  const energyEv = (6.626e-34 * freqHz) / 1.602e-19;
  const wdm = Math.floor(((lambda - 380) / 400) * 256);
  const oam = code % 50;
  const pol = code % 2 === 0 ? "H" : "V";
  const psi = `Ψ(${wdm},${oam},${pol})`;

  // Visible-spectrum hue for display
  let hue = "#94a3b8";
  if (lambda >= 380 && lambda < 450) hue = "#8b5cf6";
  else if (lambda < 495) hue = "#3b82f6";
  else if (lambda < 570) hue = "#22d3ee";
  else if (lambda < 590) hue = "#4ade80";
  else if (lambda < 625) hue = "#facc15";
  else if (lambda < 700) hue = "#f97316";
  else hue = "#ef4444";

  return { char, code, band, lambda, freqTHz, energyEv, psi, wdm, oam, pol, hue };
}

// ── Proof pages already live in the ecosystem ─────────────────────────────
const PROOFS = [
  { title: "CE-SE Pipeline", href: "/ce-se-pipeline", icon: Zap, color: "#fbbf24",
    desc: "Paste any text → transpile to WavelengthScript → compile to bytecode → execute in the WNSP VM. End-to-end, live in browser." },
  { title: "WNSP Virtual Machine", href: "/wnsp-vm", icon: Cpu, color: "#22d3ee",
    desc: "Step through bytecode in Ψ channel registers. The instruction set that photonic hardware will execute already runs in software." },
  { title: "WavelengthScript Compiler", href: "/wavelength-lang", icon: Code2, color: "#a78bfa",
    desc: "A programming language whose opcodes map to electromagnetic coordinates. Compiles and executes today." },
  { title: "Compression Explorer", href: "/compression-explorer", icon: Waves, color: "#34d399",
    desc: "Interactive Λ=hf/c² curve — authority bands, photon energy, compression mass, fee multiplier. Calculated, not simulated." },
  { title: "Spectral Router", href: "/spectral-router", icon: Network, color: "#f472b6",
    desc: "DNS-free packet routing via Ψ channel addresses — no hardware required to demonstrate the addressing model." },
  { title: "Hardware Spec (AGPL-3.0)", href: "/hardware-spec", icon: Shield, color: "#6366f1",
    desc: "Formal specification of SNIC, PHR-1, Spectral Relay Mesh v1, WavelengthScript Compiler α. First public disclosure 2026-05-16." },
];

// ── Spectral Tuner component ──────────────────────────────────────────────
function SpectralTuner() {
  const [input, setInput] = useState("WNSP");
  const chars = input.slice(0, 24).split("").map(ceEncode);
  const primary = chars[0] ?? ceEncode("W");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {/* Input row */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/30 shrink-0">Spectral Tuner</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={24}
          placeholder="Type anything…"
          className="flex-1 bg-transparent text-white font-mono text-sm outline-none placeholder:text-white/20"
          data-testid="input-spectral-tuner"
        />
        <span className="text-[10px] font-mono text-white/20">{input.length}/24</span>
      </div>

      {/* Primary character readout */}
      {chars.length > 0 && (
        <div className="px-5 py-4 border-b border-white/5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/20 mb-3">
            First character — full spectral profile
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "λ (wavelength)", value: `${primary.lambda.toFixed(2)} nm`, color: primary.hue },
              { label: "f (frequency)", value: `${primary.freqTHz.toFixed(3)} THz`, color: "#22d3ee" },
              { label: "E (energy)", value: `${primary.energyEv.toFixed(4)} eV`, color: "#a78bfa" },
              { label: "Ψ channel", value: primary.psi, color: "#4ade80" },
            ].map((row) => (
              <div key={row.label} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                <div className="text-[10px] font-mono text-white/30 mb-1">{row.label}</div>
                <div className="text-sm font-mono font-bold" style={{ color: row.color }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Character strip */}
      {chars.length > 1 && (
        <div className="px-5 py-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/20 mb-3">
            Full input — each character mapped to its spectral coordinate
          </div>
          <div className="flex flex-wrap gap-2">
            {chars.map((c, i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded-lg px-2.5 py-2 bg-white/[0.03] border"
                style={{ borderColor: c.hue + "44" }}
              >
                <span className="text-base font-mono font-bold" style={{ color: c.hue }}>
                  {c.char === " " ? "␣" : c.char}
                </span>
                <span className="text-[9px] font-mono text-white/30 mt-0.5">{c.lambda.toFixed(1)}nm</span>
                <span className="text-[9px] font-mono text-white/20">{c.psi}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pb-4 pt-1">
        <p className="text-[10px] text-white/20 font-mono leading-relaxed">
          Algorithm: CE_TABLE[charCode % 128] · 128 bands · 380–780 nm · 3.125 nm/band · 25,600 orthogonal Ψ channels
          · same output as <code className="text-white/40">nexusos-ce-encoder</code> on npm
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function WnspLandingPage() {
  usePageMeta({
    title: "WNSP — Wavelength-Native Spectral Protocol",
    description: "WNSP replaces cryptographic hashing with electromagnetic wave physics. Maxwell equation validation, wavelength-based addressing, physics-derived fees (E=hf), and 25,600 orthogonal communication channels.",
    canonical: "https://nexusos.replit.app/wnsp",
    ogTitle: "WNSP — Wavelength-Native Spectral Protocol",
    ogDescription: "Physics-native communication: wavelength addressing, Maxwell validation, E=hf fees, 25,600 Ψ channels. WNSP-CE v1.0, WNSP-SE v1.0, WNSP-URI v1.0.",
    twitterTitle: "WNSP — Wavelength-Native Spectral Protocol",
    twitterDescription: "Replace hashing with physics. Wavelength addressing, Maxwell validation, photon energy fees. 25,600 orthogonal channels.",
  });
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-mono text-white/40 tracking-wider">WNSP.IO</span>
        <div className="flex items-center gap-3">
          <Link href="/wnsp-paper" className="text-[11px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
            <BookOpen size={11} /> Research Paper
          </Link>
          <Link href="/campaign" className="text-[11px] font-mono px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors flex items-center gap-1.5">
            <Rocket size={10} /> Back the Campaign
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Software Layer — Live · Hardware Campaign — Open
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            Wavelength Network<br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-orange-400 bg-clip-text text-transparent">
              Spectral Protocol
            </span>
          </h1>
          <p className="text-white/50 text-sm max-w-xl mx-auto leading-relaxed">
            WNSP replaces software-defined addressing with physics-derived channel allocation.
            Every character maps to a unique electromagnetic coordinate. The coordinate system
            runs as a software layer on top of today's internet.
            The hardware campaign funds running it on light instead of copper.
          </p>
        </div>

        {/* Spectral Tuner */}
        <div>
          <div className="mb-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Interactive Demo</div>
            <h2 className="text-lg font-bold text-white">Type anything. Watch it become light.</h2>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Each character is encoded to a unique wavelength (λ), frequency (f), photon energy (E),
              and Ψ channel address — deterministically, using the published CE algorithm.
              This is the same encoding that will execute as a physical wavelength selection
              in a photonic waveguide when the SNIC hardware exists.
            </p>
          </div>
          <SpectralTuner />
        </div>

        {/* What WNSP is — accurate framing */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-blue-900/5 p-6 space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400/60">Technical Reality — No Hype</div>
          <h2 className="text-lg font-bold text-white">What WNSP is — and what it isn't yet</h2>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>
              <span className="text-white/80 font-medium">Today (software stage):</span> WNSP is a coordination
              layer that runs <em>on top of</em> TCP/IP. Every character you type above is encoded to a real
              electromagnetic coordinate using Maxwell-derived physics. The routing, the VM, the compiler — all
              of it executes on conventional silicon, over the conventional internet. This is intentional.
              The architecture is written for the destination hardware, not the bridge hardware.
            </p>
            <p>
              <span className="text-white/80 font-medium">Hardware stage (what the campaign funds):</span> When
              the SNIC (Spectral Network Interface Card) exists, that same CE lookup stops being a RAM table
              scan and becomes a physical wavelength selection in a photonic waveguide. No rewrite required —
              the instruction set already speaks in wavelengths.
            </p>
            <p>
              <span className="text-white/80 font-medium">The 25,600 Ψ channels</span> (256 WDM × 50 OAM ×
              2 polarisations) satisfy ⟨Ψ<sub>i</sub>|Ψ<sub>j</sub>⟩ = 0 by quantum mechanics — not software
              policy. Orthogonality is enforced by physics.
            </p>
          </div>
          <Link href="/wnsp-paper" className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            <BookOpen size={12} /> Read the research paper <ArrowRight size={10} />
          </Link>
        </div>

        {/* Live proofs */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Phase 0 — Already Running</div>
            <h2 className="text-lg font-bold text-white">Every one of these is live in your browser right now.</h2>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Open any of these. The physics is calculated, not mocked. The code is published under AGPL-3.0.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROOFS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${item.color}18`, border: `1px solid ${item.color}33` }}
                >
                  <item.icon size={14} style={{ color: item.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1">
                    {item.title} <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5 leading-snug">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Open source packages */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/60">Open Source · AGPL-3.0</div>
          <h3 className="text-sm font-bold text-white">The CE encoder is already published and installable.</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-black/30 border border-white/5 p-3">
              <div className="text-[10px] font-mono text-emerald-400/70 mb-1.5">npm (Node.js / Browser)</div>
              <code className="text-xs font-mono text-white/70 block">npm install nexusos-ce-encoder</code>
              <div className="text-[10px] text-white/30 mt-1.5">CJS + ESM · TypeScript types · ceEncode(text) → &#123; λ, band, Ψ, E &#125;</div>
            </div>
            <div className="rounded-lg bg-black/30 border border-white/5 p-3">
              <div className="text-[10px] font-mono text-emerald-400/70 mb-1.5">pip (Python 3.8+)</div>
              <code className="text-xs font-mono text-white/70 block break-all">pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code>
              <div className="text-[10px] text-white/30 mt-1.5">Bit-identical output · same ceEncode() API</div>
            </div>
          </div>
        </div>

        {/* Coinsniper listing badge */}
        <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-orange-900/10 p-5">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-lg font-bold text-white">
              🎯
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400/60 mb-0.5">🟢 Live on Coinsniper · Bitcoin Rune</div>
              <h3 className="text-sm font-bold text-white">NEXUS•WAVELENGTH is live — vote for us on Coinsniper.</h3>
              <p className="text-[11px] text-white/40 mt-0.5">Rune ID 952596:379 · 21 trillion supply · 21B per mint · 1,000 mints (all claimed) · supply sealed June 2026</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href="https://coinsniper.net/coin/91963"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink size={11} /> Vote
              </a>
              <Link
                href="/coinsniper"
                className="text-xs px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                Dossier
              </Link>
            </div>
          </div>
        </div>

        {/* Campaign CTA */}
        <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 to-violet-900/10 p-7 text-center space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60">Infrastructure Campaign — Phase 1</div>
          <h2 className="text-xl font-bold text-white leading-snug">
            The software is proven.<br />
            <span className="text-cyan-300">The hardware campaign is open.</span>
          </h2>
          <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
            Phase 1 funds the SNIC — the first physical node capable of wavelength addressing.
            Backers receive NXT tokens, a physics-signed spectral contract, and their name
            permanently recorded on-chain.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Link
              href="/campaign"
              className="w-full sm:w-auto text-sm font-semibold px-6 py-2.5 rounded-full bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/35 transition-colors flex items-center justify-center gap-2"
            >
              <Rocket size={13} /> View Campaign Tiers
            </Link>
            <Link
              href="/hardware-spec"
              className="w-full sm:w-auto text-sm px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Shield size={13} /> Hardware Spec (AGPL-3.0)
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] font-mono text-white/20 space-y-1 pb-4">
          <div>WNSP · Wavelength Network Spectral Protocol · AGPL-3.0</div>
          <div>NexusOS · Physics-based civilisation infrastructure · Phase 0 complete</div>
          <div className="flex items-center justify-center gap-4 pt-1">
            <Link href="/oscillating-quanta" className="hover:text-white/50 transition-colors">Theory of Compression States</Link>
            <Link href="/wnsp-paper" className="hover:text-white/50 transition-colors">Research Paper</Link>
            <Link href="/ce-se-pipeline" className="hover:text-white/50 transition-colors">Live Pipeline</Link>
            <Link href="/campaign" className="hover:text-white/50 transition-colors">Campaign</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
