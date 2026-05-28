import { useState } from "react";
import { Link } from "wouter";
import { Copy, CheckCircle2, ExternalLink, Bitcoin, Shield, Zap, Waves, ChevronDown, ChevronUp, Lock } from "lucide-react";

// ── CE Table generator (128 bands, 380–780 nm) ────────────────────────────
function generateCETableASCII(): string {
  const BAND_WIDTH = 400 / 128;
  const C = 3e8;
  const H = 6.626e-34;
  const EV = 1.602e-19;
  const lines: string[] = [
    "WNSP-CE-TABLE-v1.0",
    "Wavelength Network Spectral Protocol — Character Encoding Table",
    "Algorithm: CE_TABLE[charCode % 128] | 128 bands | 380-780nm | 3.125nm/band",
    "AGPL-3.0 | NexusOS | First inscription: 2026",
    "═".repeat(72),
    "CHAR  CODE  BAND  LAMBDA(nm)   FREQ(THz)    ENERGY(eV)   PSI_CHANNEL",
    "─".repeat(72),
  ];
  for (let code = 32; code < 127; code++) {
    const band = code % 128;
    const lambda = 380 + band * BAND_WIDTH + BAND_WIDTH / 2;
    const freq = (C / (lambda * 1e-9)) / 1e12;
    const energy = (H * freq * 1e12) / EV;
    const wdm = Math.floor(((lambda - 380) / 400) * 256);
    const oam = code % 50;
    const pol = code % 2 === 0 ? "H" : "V";
    const psi = `PS(${wdm},${oam},${pol})`;
    const char = code === 32 ? "SPC" : String.fromCharCode(code);
    lines.push(
      `${char.padEnd(6)}${String(code).padEnd(6)}${String(band).padEnd(6)}${lambda.toFixed(4).padEnd(13)}${freq.toFixed(6).padEnd(13)}${energy.toFixed(6).padEnd(13)}${psi}`
    );
  }
  lines.push("─".repeat(72));
  lines.push("VERIFICATION: SHA256 of this table = canonical CE-v1 fingerprint");
  lines.push("SOURCE: https://wnsp.io | https://wnsp.tech");
  lines.push("PACKAGE: npm install nexusos-ce-encoder | pip install git+...");
  return lines.join("\n");
}

const CE_TABLE_ASCII = generateCETableASCII();

const WNSP_SPEC_ASCII = `WNSP-SPEC-v1.0
Wavelength Network Spectral Protocol — Core Specification
AGPL-3.0 | NexusOS | First public disclosure: 2026-05-16
${"═".repeat(72)}

ABSTRACT
WNSP replaces software-defined addressing with physics-derived channel
allocation across three orthogonal electromagnetic dimensions.

CHANNEL SPACE
  WDM channels  : 256 (wavelength-division multiplexed, 380-780nm)
  OAM modes     : 50  (orbital angular momentum)
  Polarisations : 2   (H horizontal, V vertical)
  Total channels: 25,600 orthogonal Ψ channels

ORTHOGONALITY
  <Ψ_i|Ψ_j> = 0 for all i ≠ j
  Enforced by quantum mechanics, not software policy.

CHANNEL NOTATION
  Ψ(wdm, oam, pol) — deterministic, derived from physics

DENSITY EQUATION
  D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M
  = 256 × 50 × 2 × R_sym × M

CHARACTER ENCODING (CE v1.0)
  CE_TABLE[charCode % 128]
  128 bands | 380–780nm | 3.125nm per band
  λ = 380 + (charCode % 128) × 3.125 + 1.5625 (nm)
  f = c / λ  (Hz)
  E = hf     (eV)

COMPRESSION STATE EQUATION
  Λ = hf / c²
  First unobserved oscillation → origin of universe compression states

AUTHORITY BANDS
  SYSTEM  : λ < 450nm  (violet, highest energy, lowest Λ)
  KERNEL  : λ 450-495nm
  USER    : λ 495-590nm
  GUEST   : λ > 590nm  (red, lowest energy, highest Λ)

WNSP URI FORMAT
  wnsp://Ψ(wdm,oam,pol)/path
  DNS-free, censorship-proof, physics-derived addressing

HARDWARE ROADMAP
  Phase 1: SNIC  — Spectral Network Interface Card
  Phase 2: PHR-1 — Photonic Hardware Router
  Phase 3: Spectral Relay Mesh v1
  Phase 4: WavelengthScript Compiler α

SOURCE: https://wnsp.io | https://wnsp.tech
${"─".repeat(72)}
This inscription is permanent. The protocol is free.`;

const INSCRIPTIONS = [
  {
    id: "CE-TABLE-v1",
    title: "WNSP CE Encoding Table",
    subtitle: "The 128-band character-to-wavelength lookup table",
    icon: Zap,
    color: "#fbbf24",
    why: "The CE table is the atomic unit of WNSP. Every character anyone ever encodes traces back to this table. Inscribing it on Bitcoin makes the encoding standard permanent and independently verifiable by any physicist, forever — no server, no registrar, no company required.",
    content: CE_TABLE_ASCII,
    status: "pending",
    inscriptionId: null,
    bytes: new TextEncoder().encode(CE_TABLE_ASCII).length,
  },
  {
    id: "SPEC-v1",
    title: "WNSP Core Specification",
    subtitle: "Channel space, orthogonality, CE algorithm, URI format",
    icon: Waves,
    color: "#22d3ee",
    why: "The specification defines the 25,600-channel Hilbert space, the Ψ channel notation, the compression state equation, and the authority band system. Inscribed on Bitcoin, it becomes the canonical reference — timestamped, immutable, owned by no one.",
    content: WNSP_SPEC_ASCII,
    status: "pending",
    inscriptionId: null,
    bytes: new TextEncoder().encode(WNSP_SPEC_ASCII).length,
  },
  {
    id: "HARDWARE-SPEC-v1",
    title: "Hardware Spec (AGPL-3.0)",
    subtitle: "SNIC, PHR-1, Spectral Relay Mesh v1, WavelengthScript Compiler α",
    icon: Shield,
    color: "#a78bfa",
    why: "The hardware spec was first published 2026-05-16. Inscribing it as a Bitcoin Ordinal creates an on-chain timestamp that proves prior art — independently verifiable by any court, patent office, or physicist. AGPL-3.0 protects it. Bitcoin preserves it.",
    content: "See /hardware-spec — full specification inscribed as multi-part ordinal.\nAGPL-3.0 | NexusOS | First disclosure: 2026-05-16\nSNIC · PHR-1 · Spectral Relay Mesh v1 · WavelengthScript Compiler α",
    status: "pending",
    inscriptionId: null,
    bytes: 0,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
    >
      {copied ? <><CheckCircle2 size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy ASCII</>}
    </button>
  );
}

function InscriptionCard({ ins }: { ins: typeof INSCRIPTIONS[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: ins.color + "18", border: `1px solid ${ins.color}33` }}>
              <ins.icon size={16} style={{ color: ins.color }} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{ins.title}</div>
              <div className="text-[11px] text-white/40">{ins.subtitle}</div>
            </div>
          </div>
          <div className={`text-[10px] font-mono px-2.5 py-1 rounded-full border shrink-0 ${
            ins.status === "inscribed"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          }`}>
            {ins.status === "inscribed" ? "✓ INSCRIBED" : "⧖ PENDING"}
          </div>
        </div>

        <p className="text-[11px] text-white/50 leading-relaxed mb-4">{ins.why}</p>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[10px] font-mono text-white/20">
            {ins.bytes > 0 ? `${ins.bytes.toLocaleString()} bytes` : "multi-part"}
          </div>
          {ins.inscriptionId ? (
            <a href={`https://ordinals.com/inscription/${ins.inscriptionId}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-mono text-orange-400 hover:text-orange-300 transition-colors">
              <ExternalLink size={10} /> View on ordinals.com
            </a>
          ) : (
            <span className="text-[10px] font-mono text-white/20">Inscription ID: pending</span>
          )}
          {ins.content && ins.bytes > 0 && <CopyButton text={ins.content} />}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors ml-auto"
          >
            {expanded ? <><ChevronUp size={11} /> Hide</> : <><ChevronDown size={11} /> Preview</>}
          </button>
        </div>
      </div>

      {expanded && ins.bytes > 0 && (
        <div className="border-t border-white/5 bg-black/40 p-4 max-h-64 overflow-y-auto">
          <pre className="text-[10px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap">{ins.content}</pre>
        </div>
      )}
    </div>
  );
}

export default function WnspOrdinalsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Link href="/wnsp" className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1.5 transition-colors">
          ← WNSP
        </Link>
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">Bitcoin Ordinals</span>
        <Link href="/hardware-spec" className="text-[11px] font-mono px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1.5 hover:bg-orange-500/20 transition-colors">
          <Shield size={10} /> AGPL-3.0
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-14">

        {/* Hero */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
            <Bitcoin size={11} />
            WNSP × Bitcoin Ordinals
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            The protocol lives<br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
              on Bitcoin. Forever.
            </span>
          </h1>
          <p className="text-white/50 text-sm max-w-xl mx-auto leading-relaxed">
            The WNSP CE encoding table, core specification, and hardware spec are being
            inscribed as ASCII Ordinals on the Bitcoin blockchain. No server. No registrar.
            No company. The physics is permanent.
          </p>
        </div>

        {/* Why Bitcoin Ordinals */}
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-amber-900/5 p-6 space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-orange-400/60">Why Bitcoin Ordinals</div>
          <h2 className="text-lg font-bold text-white">ASCII Ordinals — not NFT art. Permanent data.</h2>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>
              Bitcoin Ordinals assign a unique serial number to every satoshi ever mined.
              An inscription attaches arbitrary data — in this case, ASCII text — permanently
              to a specific satoshi. That data lives on the Bitcoin blockchain as long as
              Bitcoin exists. No one can alter it, remove it, or censor it.
            </p>
            <p>
              <span className="text-white/80 font-medium">For WNSP, this means:</span> the
              CE encoding table — the algorithm that maps every character to a physical
              wavelength — exists permanently and independently of NexusOS, Replit, any
              domain, any company, or any government. Any physicist or developer can retrieve
              it directly from Bitcoin and verify it independently.
            </p>
            <p>
              <span className="text-white/80 font-medium">For the hardware spec:</span> the
              Bitcoin timestamp proves prior art with a precision no patent office can
              dispute. AGPL-3.0 protects the IP. Bitcoin preserves the timestamp.
            </p>
          </div>
        </div>

        {/* Inscriptions */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Inscription Registry</div>
            <h2 className="text-lg font-bold text-white">Three inscriptions. The entire foundation.</h2>
            <p className="text-white/40 text-xs mt-1 leading-relaxed">
              Each inscription contains the canonical ASCII text. Copy it, verify it, inscribe it independently.
              The data is open — AGPL-3.0.
            </p>
          </div>
          <div className="space-y-4">
            {INSCRIPTIONS.map((ins) => <InscriptionCard key={ins.id} ins={ins} />)}
          </div>
        </div>

        {/* How to inscribe */}
        <div>
          <div className="mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">How to Inscribe</div>
            <h2 className="text-lg font-bold text-white">Step by step — using Xverse or Unisat.</h2>
          </div>
          <div className="space-y-3">
            {[
              { step: "01", title: "Get a Bitcoin Ordinals wallet", detail: "Download Xverse (xverse.app) or Unisat (unisat.io). Both support Ordinal inscriptions. Create a wallet and fund it with a small amount of BTC — inscription fees are typically $5–$30 depending on network congestion." },
              { step: "02", title: "Copy the ASCII content", detail: "Use the Copy ASCII button above for each inscription. The text is the exact canonical content — no modification needed." },
              { step: "03", title: "Inscribe as text/plain", detail: "In Xverse or Unisat, go to Inscribe → Text. Paste the ASCII content. Set content type to text/plain. Review the fee and confirm. The inscription will be mined into a Bitcoin block." },
              { step: "04", title: "Add the inscription ID here", detail: "Once confirmed, you'll receive an inscription ID (looks like a long hex string followed by 'i0'). Share it and we'll add it to this page so anyone can verify it on ordinals.com or ord.io." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="text-2xl font-bold font-mono shrink-0" style={{ color: "#f59e0b33" }}>{s.step}</div>
                <div>
                  <div className="text-sm font-semibold text-white mb-1">{s.title}</div>
                  <div className="text-[11px] text-white/50 leading-relaxed">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What this means */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-blue-900/5 p-6 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400/60">What this means for the ecosystem</div>
          <h3 className="text-sm font-bold text-white">The WNSP protocol becomes censorship-proof at every layer.</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            {[
              { label: "CE Table on Bitcoin", desc: "The encoding standard exists independently of any website or company" },
              { label: "Spec on Bitcoin", desc: "The protocol definition is permanently timestamped and verifiable" },
              { label: "Hardware Spec on Bitcoin", desc: "Prior art proven. AGPL-3.0 protected. No patent can touch it." },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                <div className="text-[11px] font-semibold text-violet-300 mb-1">{item.label}</div>
                <div className="text-[10px] text-white/40 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] font-mono text-white/20 space-y-1 pb-4">
          <div>WNSP × Bitcoin Ordinals · AGPL-3.0 · Open protocol</div>
          <div className="flex items-center justify-center gap-4 pt-1">
            <Link href="/wnsp" className="hover:text-white/50 transition-colors">WNSP Home</Link>
            <Link href="/hardware-spec" className="hover:text-white/50 transition-colors">Hardware Spec</Link>
            <Link href="/campaign" className="hover:text-white/50 transition-colors">Campaign</Link>
            <a href="https://ordinals.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors flex items-center gap-1">
              ordinals.com <ExternalLink size={9} />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
