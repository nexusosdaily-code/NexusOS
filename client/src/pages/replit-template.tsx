import { Link } from "wouter";
import { useState } from "react";
import { Copy, Check, ExternalLink, Terminal, Code2, Zap, ArrowRight, BookOpen } from "lucide-react";

const ACCENT = "#00e5cc";

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="flex items-center gap-1.5 text-[11px] transition-colors"
      style={{ color: c ? "#4ade80" : "rgba(255,255,255,0.35)" }}>
      {c ? <Check size={11} /> : <Copy size={11} />}
      {c ? "Copied!" : label}
    </button>
  );
}

const OUTPUT = `══════════════════════════════════════════════
  NexusOS CE Encoder — Spectral Fingerprints
══════════════════════════════════════════════

Input:      "Hello World"
Wavelength: 567.19 nm
Band:       60 / 128
Ψ Channel:  Ψ(61,11,H)
Energy:     3.50e-19 J  (E = hf)
──────────────────────────────────────────────
Input:      "def add(a, b): return a + b"
Wavelength: 534.22 nm
Band:       48 / 128
Ψ Channel:  Ψ(49,49,H)
Energy:     3.72e-19 J  (E = hf)
──────────────────────────────────────────────
Input:      "const x = BigInt(42);"
Wavelength: 521.88 nm
Band:       42 / 128
Ψ Channel:  Ψ(43,43,H)
Energy:     3.81e-19 J  (E = hf)
──────────────────────────────────────────────`;

const JS_SNIPPET = `const { ceEncode } = require("nexusos-ce-encoder");

const result = ceEncode("Hello World");
console.log(result.wavelength);  // 567.19 nm
console.log(result.psiChannel);  // Ψ(61,11,H)
console.log(result.energy);      // 3.50e-19 J`;

const PY_SNIPPET = `from ce_encoder import ce_encode

result = ce_encode("Hello World")
print(result['wavelength'])   # 567.19
print(result['psi_channel'])  # Ψ(61,11,H)
print(result['energy'])       # 3.50e-19`;

const API_SNIPPET = `GET https://wnsp.io/api/encode?text=Hello+World

{
  "ok": true,
  "wavelength_mid_nm": 567.19,
  "psi_channel": "Ψ(61,11,H)",
  "frequency_hz": 528500000000000,
  "energy_joules": 3.5e-19,
  "frame_count": 11,
  "ce_token_count": 11,
  "spectrum_color": "#9aff00"
}`;

export default function ReplitTemplatePage() {
  return (
    <div className="min-h-screen bg-black text-white font-mono">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-black/85 backdrop-blur">
        <Link href="/">
          <span className="text-sm font-bold tracking-widest cursor-pointer" style={{ color: ACCENT }}>
            NEXUS<span className="text-white">OS</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/encode">
            <span className="text-[11px] text-white/35 hover:text-white transition-colors cursor-pointer">Try Encoder →</span>
          </Link>
          <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank" rel="noreferrer"
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 transition-colors flex items-center gap-1.5">
            <ExternalLink size={10} /> GitHub
          </a>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 text-[10px] text-white/40 uppercase tracking-widest mb-4">
            <Terminal size={10} style={{ color: ACCENT }} /> Replit Starter Template
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Fork it. Run it.<br />
            <span style={{ color: ACCENT }}>See your code's wavelength.</span>
          </h1>
          <p className="text-sm text-white/40 leading-relaxed mb-6">
            One-click Replit template. Install the CE encoder, paste any code in any language,
            and get its spectral fingerprint — wavelength, photon energy, Ψ channel address.
            No account needed beyond Replit.
          </p>

          {/* Fork button */}
          <div className="flex flex-col gap-3">
            <a
              href="https://replit.com/github/nexusosdaily-code/NexusOS"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: ACCENT, color: "#000" }}
              data-testid="link-fork-replit"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 5h2v-2h-2v2zm2 0h2v2h-2v-2zm0-2h2v-2h-2v2z"/>
              </svg>
              Fork on Replit — Run in 10 seconds
            </a>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl border border-white/8 bg-white/2 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/30">npm</span>
                  <CopyBtn text="npm install nexusos-ce-encoder" />
                </div>
                <pre className="text-[11px] text-white/55">npm install nexusos-ce-encoder</pre>
              </div>
              <div className="flex-1 rounded-xl border border-white/8 bg-white/2 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/30">run</span>
                  <CopyBtn text="node index.js" />
                </div>
                <pre className="text-[11px] text-white/55">node index.js</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal output */}
        <div className="rounded-xl border border-white/10 bg-white/2 overflow-hidden mb-8">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/6 bg-white/1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="text-[10px] text-white/25 ml-2">node index.js</span>
          </div>
          <pre className="text-[11px] text-white/60 p-4 whitespace-pre-wrap leading-relaxed overflow-x-auto">{OUTPUT}</pre>
        </div>

        {/* Code tabs */}
        <div className="space-y-4 mb-8">
          {/* JS */}
          <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6">
              <div className="flex items-center gap-2">
                <Code2 size={12} style={{ color: ACCENT }} />
                <span className="text-[11px] font-bold" style={{ color: ACCENT }}>JavaScript / Node.js</span>
              </div>
              <CopyBtn text={JS_SNIPPET} />
            </div>
            <pre className="text-[11px] text-white/65 p-4 whitespace-pre-wrap leading-relaxed">{JS_SNIPPET}</pre>
          </div>

          {/* Python */}
          <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6">
              <div className="flex items-center gap-2">
                <Code2 size={12} className="text-blue-400" />
                <span className="text-[11px] font-bold text-blue-400">Python</span>
              </div>
              <CopyBtn text={PY_SNIPPET} />
            </div>
            <pre className="text-[11px] text-white/65 p-4 whitespace-pre-wrap leading-relaxed">{PY_SNIPPET}</pre>
          </div>

          {/* REST API */}
          <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6">
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-amber-400" />
                <span className="text-[11px] font-bold text-amber-400">REST API — no auth needed</span>
              </div>
              <CopyBtn text="GET https://wnsp.io/api/encode?text=Hello+World" />
            </div>
            <pre className="text-[11px] text-white/65 p-4 whitespace-pre-wrap leading-relaxed">{API_SNIPPET}</pre>
          </div>
        </div>

        {/* Physics explainer */}
        <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-8">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">The physics behind it</div>
          <div className="space-y-3 text-[12px]">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ACCENT }} />
              <div><span className="text-white">CE_TABLE algorithm:</span><span className="text-white/45"> band = charCode % 128, wavelength = 380 + (band × 3.125) nm</span></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ACCENT }} />
              <div><span className="text-white">128 spectral bands</span><span className="text-white/45"> across the full visible spectrum (380–780nm)</span></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ACCENT }} />
              <div><span className="text-white">Energy: E = hf = hc/λ</span><span className="text-white/45"> — Planck's equation. Every encode has a real photon energy.</span></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ACCENT }} />
              <div><span className="text-white">51,200 Ψ channels — 256 WDM × 50 OAM × 2 polarisations × 2 propagation directions. Orthogonal by quantum mechanics.</span></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ACCENT }} />
              <div><span className="text-white">Bit-identical output</span><span className="text-white/45"> — npm and pip return the same wavelength for the same input, always.</span></div>
            </div>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { icon: Zap, label: "Try the live encoder", href: "/encode", internal: true, color: ACCENT },
            { icon: BookOpen, label: "CE→SE full pipeline", href: "/ce-se-pipeline", internal: true, color: "#a78bfa" },
            { icon: Code2, label: "WavelengthScript", href: "/wavelength-lang", internal: true, color: "#34d399" },
            { icon: Terminal, label: "WNSP VM", href: "/wnsp-vm", internal: true, color: "#f87171" },
          ].map(({ icon: Icon, label, href, internal, color }) => (
            internal
              ? <Link key={label} href={href}>
                  <div className="flex items-center gap-2 p-3.5 rounded-xl border border-white/8 bg-white/2 hover:border-white/18 transition-all cursor-pointer group">
                    <Icon size={13} style={{ color }} />
                    <span className="text-[12px] text-white/60 group-hover:text-white transition-colors">{label}</span>
                    <ArrowRight size={10} className="ml-auto text-white/20 group-hover:text-white/40 transition-colors" />
                  </div>
                </Link>
              : <a key={label} href={href} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 p-3.5 rounded-xl border border-white/8 bg-white/2 hover:border-white/18 transition-all group">
                  <Icon size={13} style={{ color }} />
                  <span className="text-[12px] text-white/60 group-hover:text-white transition-colors">{label}</span>
                  <ExternalLink size={10} className="ml-auto text-white/20 group-hover:text-white/40 transition-colors" />
                </a>
          ))}
        </div>

        {/* Fork CTA bottom */}
        <a
          href="https://replit.com/github/nexusosdaily-code/NexusOS"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm"
          style={{ background: ACCENT, color: "#000" }}>
          Fork on Replit — Start building in 10 seconds <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}
