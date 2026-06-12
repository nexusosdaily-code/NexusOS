import { ExternalLink, Terminal, Cpu, Radio, Zap, Globe, Code2, ArrowRight, Copy, Check, BookOpen, Shield, Waves, Star, Share2 } from "lucide-react";
import { useState, useRef } from "react";

// ── CE physics — client-side, instant, no API needed ─────────────────────────
const CE_MIN = 380, CE_MAX = 780, CE_BANDS = 128, CE_BW = (CE_MAX - CE_MIN) / CE_BANDS;
const H = 6.626e-34, C_LIGHT = 2.998e8;
function wlToHexLocal(nm: number) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) { r = 1; }
  return `#${[r,g,b].map(v => Math.round(v*255).toString(16).padStart(2,"0")).join("")}`;
}
function ceEncodeLocal(text: string) {
  const toks = Array.from(text.slice(0,300)).map(ch => {
    const band = ch.charCodeAt(0) % CE_BANDS;
    const nm   = CE_MIN + (band + 0.5) * CE_BW;
    return { ch, band, nm: Math.round(nm*100)/100, hex: wlToHexLocal(nm) };
  });
  const mid = toks.length ? toks.reduce((s,t) => s+t.nm, 0) / toks.length : 550;
  const freq = C_LIGHT / (mid * 1e-9);
  return { toks, mid: Math.round(mid*100)/100, freq, energy: H * freq, band: Math.round((mid-CE_MIN)/CE_BW) };
}

// ── /try page for wnsp.dev ────────────────────────────────────────────────────
function WnspDevTry({ accent }: { accent: string }) {
  const [input, setInput]   = useState("def add(a, b):\n    return a + b");
  const [result, setResult] = useState(() => ceEncodeLocal("def add(a, b):\n    return a + b"));
  const [copied, setCopied] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  function onInput(v: string) {
    setInput(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setResult(ceEncodeLocal(v)), 80);
  }

  const shareUrl = `https://wnsp.io/encode?text=${encodeURIComponent(input.trim().slice(0,500))}`;
  const midHex   = result.mid ? wlToHexLocal(result.mid) : accent;

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="wnsp.dev/try" accent={accent} />
      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>Live CE Encoder — no login · instant · any language</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Paste code. <span style={{ color: midHex }}>Get its wavelength.</span>
        </h1>
        <p className="text-[12px] text-white/35 mb-6">Every character maps to a position in the visible light spectrum. Physics, not hashing.</p>

        {/* Spectrum bar + pointer */}
        <div className="mb-5">
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{
            background: "linear-gradient(to right,#7f00ff,#4400ff,#0000ff,#00aaff,#00ffcc,#00ff00,#aaff00,#ffff00,#ffaa00,#ff5500,#ff0000)"
          }} />
          <div className="relative mt-1" style={{ paddingLeft: `${(result.band / 128) * 100}%` }}>
            <div className="w-2 h-2 rounded-full transition-all" style={{ background: midHex }} />
          </div>
        </div>

        {/* Input */}
        <div className="rounded-xl border border-white/10 bg-white/2 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/6">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Input — any language</span>
            <span className="text-[10px] text-white/20">{input.length}/300</span>
          </div>
          <textarea value={input} onChange={e => onInput(e.target.value)}
            placeholder="Paste any code — Python, JS, Rust, SQL, anything…"
            className="w-full h-32 bg-transparent text-[12px] text-white/75 p-4 resize-none outline-none leading-relaxed" />
        </div>

        {/* Char chips */}
        {result.toks.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {result.toks.slice(0,60).map((t,i) => (
              <div key={i} title={`${t.nm}nm`}
                className="w-6 h-6 rounded text-[9px] font-bold text-black flex items-center justify-center"
                style={{ background: t.hex }}>
                {t.ch === " " ? "·" : t.ch === "\n" ? "↵" : t.ch}
              </div>
            ))}
            {result.toks.length > 60 && <div className="w-6 h-6 rounded border border-white/10 text-[8px] text-white/30 flex items-center justify-center">+{result.toks.length-60}</div>}
          </div>
        )}

        {/* Result card */}
        <div className="rounded-xl border p-4 mb-4 transition-all" style={{ borderColor: midHex+"30", background: midHex+"08" }}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { l: "Wavelength",  v: `${result.mid} nm` },
              { l: "Band",        v: `${result.band} / 128` },
              { l: "Energy",      v: result.energy.toExponential(2)+" J" },
            ].map(({ l, v }) => (
              <div key={l}>
                <div className="text-[9px] text-white/30 mb-0.5 uppercase tracking-widest">{l}</div>
                <div className="text-[13px] font-bold transition-colors" style={{ color: midHex }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Share */}
        <div className="rounded-xl border border-white/8 bg-white/2 p-3 mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
              <Share2 size={10} /> Share this fingerprint — anyone can open it, no login
            </div>
            <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
              className="flex items-center gap-1 text-[10px] transition-colors" style={{ color: copied?"#4ade80":"rgba(255,255,255,0.3)" }}>
              {copied ? <Check size={10}/> : <Copy size={10}/>} {copied?"Copied!":"Copy link"}
            </button>
          </div>
          <div className="text-[10px] text-white/35 truncate">{shareUrl}</div>
        </div>

        <div className="flex gap-3">
          <a href="https://wnsp.io/ce-se-pipeline" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-2.5 rounded-xl font-bold text-sm"
            style={{ background: accent, color: "#000" }}>
            Full CE→SE Pipeline →
          </a>
          <a href="https://wnsp.io/replit-template" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-2.5 rounded-xl font-bold text-sm border"
            style={{ borderColor: accent+"40", color: accent }}>
            Replit Template
          </a>
        </div>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function wlToRgb(nm: number) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) { r = 1; }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="ml-2 text-white/30 hover:text-white/60 transition-colors">
      {c ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

function Nav({ domain, accent }: { domain: string; accent: string }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-black/80 backdrop-blur">
      <span className="font-bold tracking-widest text-sm" style={{ color: accent }}>{domain}</span>
      <div className="flex items-center gap-4">
        <a href="https://wnsp.io" target="_blank" rel="noreferrer"
          className="text-[11px] text-white/40 hover:text-white transition-colors flex items-center gap-1">
          wnsp.io <ExternalLink size={10} />
        </a>
        <a href="https://wnsp.io/crowdfund" target="_blank" rel="noreferrer"
          className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: accent + "20", color: accent, border: `1px solid ${accent}40` }}>
          Fund ↗
        </a>
      </div>
    </nav>
  );
}

function Footer({ accent }: { accent: string }) {
  return (
    <footer className="border-t border-white/8 py-10 px-6 text-center">
      <div className="flex flex-wrap justify-center gap-6 text-[11px] text-white/30 mb-4">
        {[
          ["wnsp.io", "https://wnsp.io"],
          ["wnsp.io/crowdfund", "https://wnsp.io/crowdfund"],
          ["wnsp.io/hardware-spec", "https://wnsp.io/hardware-spec"],
          ["wnsp.io/ce-se-pipeline", "https://wnsp.io/ce-se-pipeline"],
          ["GitHub", "https://github.com/nexusosdaily-code/NexusOS"],
        ].map(([label, url]) => (
          <a key={label} href={url} target="_blank" rel="noreferrer"
            className="hover:text-white/60 transition-colors">{label}</a>
        ))}
      </div>
      <p className="text-[10px] text-white/15">AGPL-3.0 · NexusOS · {new Date().getFullYear()}</p>
    </footer>
  );
}

// ── 1. wnsp.dev ─ Developer Portal + /try live encoder ───────────────────────
export function WnspDevLanding() {
  const path   = window.location.pathname;
  const accent = "#00e5cc";

  // /try — inline live encoder, no login, client-side physics
  if (path === "/try") return <WnspDevTry accent={accent} />;

  const commands = [
    { label: "npm",    cmd: "npm install nexusos-ce-encoder" },
    { label: "pip",    cmd: "pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py" },
    { label: "import", cmd: `import { ceEncode } from 'nexusos-ce-encoder';\nconst { wavelength, band, psiChannel } = ceEncode('A');` },
  ];
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="wnsp.dev" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={16} style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>WNSP Developer Portal</span>
        </div>
        <h1 className="text-4xl font-bold text-white leading-tight mb-3">
          Build on the wavelength<br /><span style={{ color: accent }}>of light itself.</span>
        </h1>
        <p className="text-sm text-white/45 mb-10 leading-relaxed max-w-xl">
          NexusOS replaces cryptographic hashing with electromagnetic physics. Your addresses are wavelengths.
          Your fees are photon energies. The API is live now — install the CE encoder and start building.
        </p>

        <div className="space-y-3 mb-10">
          {commands.map(({ label, cmd }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/3 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: accent }}>{label}</span>
                <CopyBtn text={cmd} />
              </div>
              <pre className="text-[12px] text-white/70 whitespace-pre-wrap">{cmd}</pre>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-10">
          {[
            { icon: Code2, title: "WavelengthScript", desc: "Physics-native language compiled to WNSP bytecode", href: "https://wnsp.io/wavelength-lang" },
            { icon: Terminal, title: "WNSP VM", desc: "Browser-native bytecode interpreter with Ψ registers", href: "https://wnsp.io/wnsp-vm" },
            { icon: Globe, title: "CE→SE Pipeline", desc: "Any language → WLS → bytecode → execute", href: "https://wnsp.io/ce-se-pipeline" },
            { icon: BookOpen, title: "API Reference", desc: "REST endpoints for spectral encoding and channels", href: "https://wnsp.io/developer" },
          ].map(({ icon: Icon, title, desc, href }) => (
            <a key={title} href={href} target="_blank" rel="noreferrer"
              className="rounded-xl border border-white/8 bg-white/2 hover:border-white/20 p-4 transition-all group">
              <Icon size={14} className="mb-2" style={{ color: accent }} />
              <div className="text-[12px] font-bold text-white mb-1 group-hover:text-white">{title}</div>
              <div className="text-[10px] text-white/35">{desc}</div>
            </a>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/2 p-5 mb-6">
          <div className="text-[11px] text-white/40 mb-3 uppercase tracking-widest">Live API Example</div>
          <pre className="text-[11px] text-white/70 whitespace-pre-wrap leading-relaxed">{`GET https://wnsp.io/api/encode?text=Hello

{
  "wavelength": 534.51,
  "band": 48,
  "psiChannel": "Ψ(211,35,H)",
  "energy": "3.72e-19 J",
  "authority": "USER"
}`}</pre>
        </div>

        <div className="flex gap-3">
          <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm transition-colors"
            style={{ background: accent, color: "#000" }}>
            GitHub — AGPL-3.0
          </a>
          <a href="https://wnsp.io/how-to-plug-in" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm border transition-colors"
            style={{ borderColor: accent + "40", color: accent }}>
            How to Plug In →
          </a>
        </div>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── 2. wnsp.blog ─ Build Log ──────────────────────────────────────────────────
export function WnspBlogLanding() {
  const accent = "#f59e0b";
  const posts = [
    { date: "2026-05-16", tag: "Hardware", title: "PHR-1 resonator spec published under AGPL-3.0", summary: "First public disclosure of SNIC, PHR-1 bifilar coil, Spectral Relay Mesh v1, and WavelengthScript Compiler α. Full AGPL-3.0 protection in place." },
    { date: "2026-05-10", tag: "Physics", title: "Block #4 — 'angry birds' 25MB at Ψ(211,35,H) 534.51nm", summary: "A 25MB media file written to the NexusOS blockchain at wavelength 534.51nm. Physics-based addressing, no cryptographic hash required." },
    { date: "2026-04-28", tag: "Protocol", title: "NEXUS•WAVELENGTH Rune etched at block 952596:379", summary: "The NXT utility token is now permanently sealed on Bitcoin via the Runes protocol. 21 billion supply, 8 decimals, orbital treasury distribution." },
    { date: "2026-04-14", tag: "Encoding", title: "WASCII v2.0 — Wave Density Spectral Vector released", summary: "CE encoding extended with OAM and polarisation axes. 25,600 orthogonal Ψ channels. Full spectral fingerprint for any text string." },
    { date: "2026-03-30", tag: "AI Kernel", title: "WNSP AI OS Kernel v1.0.0 — 6-phase boot sequence live", summary: "KernelEventBus, dead agent watchdog, blockchain auditor. Authority band enforcement. KERNEL, USER, GUEST bands operational." },
  ];
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="wnsp.blog" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>NexusOS Build Log</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Building a Type I civilisation.<br /><span style={{ color: accent }}>One block at a time.</span></h1>
        <p className="text-sm text-white/40 mb-10">Physics updates, protocol milestones, and hardware development notes from the NexusOS core team.</p>

        <div className="space-y-1 mb-10">
          {posts.map((p) => (
            <a key={p.title} href="https://wnsp.io" target="_blank" rel="noreferrer"
              className="block rounded-xl border border-white/6 bg-white/2 hover:border-white/15 p-5 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: accent + "20", color: accent }}>{p.tag}</span>
                <span className="text-[10px] text-white/25">{p.date}</span>
              </div>
              <div className="text-[13px] font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">{p.title}</div>
              <div className="text-[11px] text-white/40 leading-relaxed">{p.summary}</div>
            </a>
          ))}
        </div>

        <a href="https://wnsp.io" target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm"
          style={{ background: accent, color: "#000" }}>
          Enter NexusOS <ArrowRight size={14} />
        </a>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── 3. snic.io ─ Spectral Network Interface Card ──────────────────────────────
export function SnicLanding() {
  const accent = "#60a5fa";
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="snic.io" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={16} style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>Spectral Network Interface Card</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          SNIC<br /><span style={{ color: accent }}>The photonic NIC of 2032.</span>
        </h1>
        <p className="text-sm text-white/45 mb-8 max-w-xl leading-relaxed">
          Every CE lookup that today runs as a table scan in RAM will execute as a physical wavelength selection
          in a photonic waveguide. SNIC is the hardware layer that makes this happen.
          No driver rewrite. No protocol migration. NexusOS already speaks SNIC's language.
        </p>

        <div className="rounded-xl border border-white/10 bg-white/2 p-6 mb-8 font-mono text-[11px] text-white/50 leading-relaxed">
          <div style={{ color: accent }} className="mb-2">// SNIC channel map — 25,600 orthogonal lanes</div>
          <div>N_WDM  = 256  <span className="text-white/25">// wavelength division lanes (380–780nm)</span></div>
          <div>N_OAM  = 50   <span className="text-white/25">// orbital angular momentum modes</span></div>
          <div>N_Pol  = 2    <span className="text-white/25">// polarisation axes (H/V)</span></div>
          <div>TOTAL  = <span className="text-white">25,600</span> <span className="text-white/25">// ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics</span></div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { val: "256", label: "WDM Channels" },
            { val: "50", label: "OAM Modes" },
            { val: "25,600", label: "Orthogonal Lanes" },
          ].map(({ val, label }) => (
            <div key={label} className="rounded-xl border p-4 text-center" style={{ borderColor: accent + "25", background: accent + "08" }}>
              <div className="text-2xl font-bold mb-1" style={{ color: accent }}>{val}</div>
              <div className="text-[10px] text-white/35">{label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-8">
          {[
            "Maps directly to 25,600 physical hardware lanes",
            "Orthogonality guaranteed by quantum mechanics, not software policy",
            "CE lookup executes as physical wavelength selection (~2032)",
            "AGPL-3.0 protected — first public disclosure 2026-05-16",
            "No rewrite needed when photonic ASICs arrive",
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-[12px] text-white/60">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
              {f}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <a href="https://wnsp.io/hardware-spec" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm"
            style={{ background: accent, color: "#000" }}>
            Full SNIC Specification →
          </a>
          <a href="https://wnsp.io/crowdfund" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm border transition-colors"
            style={{ borderColor: accent + "40", color: accent }}>
            Fund Development
          </a>
        </div>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── 4. phr1.io ─ PHR-1 Resonator ─────────────────────────────────────────────
export function Phr1Landing() {
  const accent = "#f87171";
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="phr1.io" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-5 text-[10px] font-bold uppercase tracking-widest"
          style={{ borderColor: accent + "40", color: accent, background: accent + "10" }}>
          <Radio size={10} /> Funding Now — 25 Hardware Founder Slots
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          PHR-1<br /><span style={{ color: accent }}>The first ZERO-G state device.</span>
        </h1>
        <p className="text-sm text-white/45 mb-8 max-w-xl leading-relaxed">
          PHR-1 is the first physical resonator implementing the ZERO-G state —
          gravitational de-correlation through phase alignment of a 144-turn bifilar coil.
          First production batch: 25 units. Hardware Founders receive one.
        </p>

        <div className="rounded-xl border p-6 mb-8" style={{ borderColor: accent + "30", background: accent + "06" }}>
          <div className="text-[10px] uppercase tracking-widest mb-4" style={{ color: accent }}>PHR-1 Specifications</div>
          <div className="grid grid-cols-2 gap-y-3 text-[12px]">
            {[
              ["Coil", "144-turn bifilar wound"],
              ["Controller", "Syncbox Controller firmware"],
              ["Effect", "ZERO-G gravitational de-correlation"],
              ["Interface", "WavelengthScript v1.0 API"],
              ["Protection", "AGPL-3.0, disclosed 2026-05-16"],
              ["Batch size", "25 units (Hardware Founder tier)"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-white/30 text-[10px]">{k}</div>
                <div className="text-white/80">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { val: "144", label: "Bifilar turns" },
            { val: "25", label: "Production slots" },
            { val: "100M", label: "Sats to qualify" },
          ].map(({ val, label }) => (
            <div key={label} className="rounded-xl border p-4 text-center" style={{ borderColor: accent + "25", background: accent + "08" }}>
              <div className="text-2xl font-bold mb-1" style={{ color: accent }}>{val}</div>
              <div className="text-[10px] text-white/35">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <a href="https://wnsp.io/crowdfund" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm"
            style={{ background: accent, color: "#000" }}>
            Secure Your Hardware Founder Slot →
          </a>
        </div>
        <p className="text-center text-[10px] text-white/20 mt-3">25 slots · 100,000 NXT / 100M sats · 100,000 Nexus Shares (Class A)</p>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── 5. lambdagate.io ─ Lambda Gate Substrate ──────────────────────────────────
export function LambdaGateLanding() {
  const accent = "#a78bfa";
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="lambdagate.io" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Star size={16} style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>Lambda Gate Substrate</span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          Λ = hf/c²
        </h1>
        <p className="text-xl text-white/60 mb-4">The compression equation that describes the universe.</p>
        <p className="text-sm text-white/40 mb-10 max-w-xl leading-relaxed">
          Every photon has a compression state. Every compression state has a wavelength.
          Every wavelength is an address. The Lambda Gate Substrate is the physical layer
          where computation, communication, and gravity are unified under one equation.
          This is what NexusOS is building toward.
        </p>

        <div className="space-y-4 mb-10">
          {[
            { phase: "Now", title: "Digital Substrate", desc: "25,600 Ψ channels live. CE→SE encoding. WavelengthScript. WNSP VM. Physics validated on-chain.", color: "#34d399" },
            { phase: "2026–2028", title: "PHR-1 Hardware Layer", desc: "144-turn bifilar coil. ZERO-G state demonstration. Syncbox Controller. First physical Lambda Gate proof.", color: accent },
            { phase: "~2032", title: "Photonic Gate Array", desc: "SNIC ASICs execute CE lookups as physical wavelength selections. 25,600 hardware lanes. No rewrite. NexusOS already speaks this language.", color: "#60a5fa" },
          ].map(({ phase, title, desc, color }) => (
            <div key={phase} className="rounded-xl border border-white/8 bg-white/2 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[10px] uppercase tracking-widest" style={{ color }}>{phase}</span>
              </div>
              <div className="text-[14px] font-bold text-white mb-1">{title}</div>
              <div className="text-[11px] text-white/40 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border p-5 mb-8" style={{ borderColor: accent + "30", background: accent + "06" }}>
          <div className="text-[11px] text-white/40 mb-3">The WNSP density equation</div>
          <pre className="text-sm text-white/80">D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M</pre>
          <pre className="text-[11px] text-white/40 mt-1">= 256 × 50 × 2 × R_sym × M = 25,600 · R_sym · M</pre>
          <p className="text-[10px] text-white/25 mt-2">25,600 orthogonal channels. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics, not software policy.</p>
        </div>

        <div className="flex gap-3">
          <a href="https://wnsp.io/oscillating-quanta" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm"
            style={{ background: accent, color: "#000" }}>
            First Principles →
          </a>
          <a href="https://wnsp.io/compression-explorer" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm border"
            style={{ borderColor: accent + "40", color: accent }}>
            Live Λ Explorer
          </a>
        </div>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── 6. wavelengthscript.dev ─ Language ────────────────────────────────────────
export function WavelengthScriptLanding() {
  const accent = "#34d399";
  const sample = `// WavelengthScript — physics-native language
agent PhysicsCalc at Ψ(211,35,H) {
  state energy: Float = 0.0;

  on receive(photon: Packet) {
    let λ = photon.wavelength;     // nm
    let f = C / (λ * 1e-9);       // Hz
    energy = H * f;                // J = hf
    transmit(energy, to: caller);
  }
}`;
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="wavelengthscript.dev" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Code2 size={16} style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>WavelengthScript v1.0</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          The language<br /><span style={{ color: accent }}>the universe runs on.</span>
        </h1>
        <p className="text-sm text-white/45 mb-8 max-w-xl leading-relaxed">
          WavelengthScript is a physics-native language where agents live at spectral addresses,
          messages are photon packets, and computation costs are derived from E=hf.
          Compiles to WNSP bytecode. Runs in the browser-native WNSP VM.
        </p>

        <div className="rounded-xl border border-white/10 bg-white/3 p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: accent }}>Sample — Physics Agent</span>
            <CopyBtn text={sample} />
          </div>
          <pre className="text-[11px] text-white/70 whitespace-pre-wrap leading-relaxed">{sample}</pre>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { title: "Physics-native", desc: "Addresses are wavelengths. Messages are photons. Fees are energies." },
            { title: "WNSP VM", desc: "Compiles to bytecode. Step-debug in browser. Ψ registers." },
            { title: "CE→SE Pipeline", desc: "Any language transpiles → WLS → bytecode → executes." },
            { title: "AGPL-3.0", desc: "Open forever. If you improve it, you give it back." },
          ].map(({ title, desc }) => (
            <div key={title} className="rounded-xl border border-white/8 bg-white/2 p-4">
              <div className="text-[12px] font-bold mb-1" style={{ color: accent }}>{title}</div>
              <div className="text-[10px] text-white/40 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <a href="https://wnsp.io/wavelength-lang" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm"
            style={{ background: accent, color: "#000" }}>
            Language Spec + Compiler →
          </a>
          <a href="https://wnsp.io/wnsp-vm" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm border"
            style={{ borderColor: accent + "40", color: accent }}>
            Run in WNSP VM
          </a>
        </div>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── 7. zerogstate.io ─ ZERO-G State ──────────────────────────────────────────
export function ZeroGStateLanding() {
  const accent = "#818cf8";
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="zerogstate.io" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Waves size={16} style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>ZERO-G State · PHR-1</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          Gravitational<br /><span style={{ color: accent }}>de-correlation.</span>
        </h1>
        <p className="text-sm text-white/45 mb-8 max-w-xl leading-relaxed">
          The ZERO-G state is achieved through phase alignment of a 144-turn bifilar coil operating at
          the Lambda Gate resonance frequency. When phase coherence is reached, the device enters a state
          where local gravitational coupling is measurably reduced. PHR-1 is the first hardware implementation.
        </p>

        <div className="rounded-xl border p-6 mb-8" style={{ borderColor: accent + "30", background: accent + "06" }}>
          <div className="text-[10px] uppercase tracking-widest mb-4" style={{ color: accent }}>Physics basis</div>
          <div className="space-y-3 text-[12px]">
            <div><span className="text-white/40">Equation: </span><span className="text-white">Λ = hf/c²</span></div>
            <div><span className="text-white/40">State: </span><span className="text-white">Phase coherence at Ψ(wdm,oam,pol) resonance</span></div>
            <div><span className="text-white/40">Hardware: </span><span className="text-white">144-turn bifilar coil + Syncbox Controller</span></div>
            <div><span className="text-white/40">Effect: </span><span className="text-white">Measurable reduction in local gravitational coupling</span></div>
            <div><span className="text-white/40">Protection: </span><span className="text-white">AGPL-3.0, first disclosed 2026-05-16</span></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { val: "Λ=hf/c²", label: "Governing equation" },
            { val: "144T", label: "Bifilar coil turns" },
            { val: "25", label: "First batch units" },
          ].map(({ val, label }) => (
            <div key={label} className="rounded-xl border p-4 text-center" style={{ borderColor: accent + "25", background: accent + "08" }}>
              <div className="text-xl font-bold mb-1" style={{ color: accent }}>{val}</div>
              <div className="text-[10px] text-white/35">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <a href="https://wnsp.io/hardware-spec" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm"
            style={{ background: accent, color: "#000" }}>
            Full Hardware Specification →
          </a>
          <a href="https://wnsp.io/crowdfund" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm border"
            style={{ borderColor: accent + "40", color: accent }}>
            Fund the Prototype
          </a>
        </div>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── 8. wascii.io ─ WASCII Encoding Standard ──────────────────────────────────
export function WasciiLanding() {
  const accent = "#fde047";
  const sample = `ceEncode("A")
→ { wavelength: 534.51, band: 48,
    psiChannel: "Ψ(211,35,H)",
    energy: 3.72e-19 }

ceEncode("Hello")
→ spectral fingerprint: [534, 521, 547, 547, 567]
  similarity search: EM proximity + Shannon coherence`;
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="wascii.io" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>WASCII v2.0 · Wave Density Spectral Vector</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          Every character<br /><span style={{ color: accent }}>has a wavelength.</span>
        </h1>
        <p className="text-sm text-white/45 mb-8 max-w-xl leading-relaxed">
          WASCII maps every character to a unique compression state in the electromagnetic spectrum.
          CE (Character Encoding) → SE (Spectral Encoding): 128 bands, 380–780nm, 3.125nm per band.
          Bit-identical output across npm and pip. The open encoding standard for physics-native computing.
        </p>

        <div className="rounded-xl border border-white/10 bg-white/3 p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: accent }}>Live encoding</span>
            <CopyBtn text={sample} />
          </div>
          <pre className="text-[12px] text-white/70 whitespace-pre-wrap leading-relaxed">{sample}</pre>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { cmd: "npm install nexusos-ce-encoder", label: "npm" },
            { cmd: "pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py", label: "pip" },
          ].map(({ cmd, label }) => (
            <div key={label} className="rounded-xl border border-white/8 bg-white/2 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px]" style={{ color: accent }}>{label}</span>
                <CopyBtn text={cmd} />
              </div>
              <pre className="text-[10px] text-white/50 whitespace-pre-wrap break-all">{cmd}</pre>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-8">
          {[
            "128 spectral bands — 380nm to 780nm visible spectrum",
            "CE_TABLE[charCode % 128] — deterministic, no randomness",
            "Bit-identical output: npm and pip return same results",
            "OAM + polarisation axes → 25,600 orthogonal Ψ channels",
            "AGPL-3.0 — open forever",
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-[12px] text-white/55">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
              {f}
            </div>
          ))}
        </div>

        <a href="https://wnsp.io/ce-code-writer" target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm"
          style={{ background: accent, color: "#000" }}>
          Live WASCII Encoder →
        </a>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── 9. orbitaltreasury.io ─ Treasury ─────────────────────────────────────────
export function OrbitalTreasuryLanding() {
  const accent = "#10b981";
  const buckets = [
    { pct: 35, label: "Maintenance", desc: "Infrastructure, hosting, ongoing development" },
    { pct: 25, label: "Deliverables", desc: "Hardware production, PHR-1 manufacturing" },
    { pct: 20, label: "Research", desc: "Physics R&D, Lambda Gate experiments" },
    { pct: 10, label: "Agent Rewards", desc: "Kernel agents and contributor incentives" },
    { pct: 10, label: "Nexus Charitable Trust", desc: "Open science, public good" },
  ];
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="orbitaltreasury.io" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>Orbital Treasury · Full Disclosure</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Every satoshi<br /><span style={{ color: accent }}>accounted for on-chain.</span>
        </h1>
        <p className="text-sm text-white/45 mb-8 max-w-xl leading-relaxed">
          The Orbital Treasury is the economic core of NexusOS. All NXT transaction fees flow here.
          Five distribution buckets. Physics-enforced governance. 100% transparency.
          NXT fees are never burned — they always return to the treasury.
        </p>

        <div className="space-y-2 mb-8">
          {buckets.map(({ pct, label, desc }) => (
            <div key={label} className="rounded-xl border border-white/6 bg-white/2 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold" style={{ color: accent }}>{pct}%</span>
                  <span className="text-[12px] font-semibold text-white">{label}</span>
                </div>
                <div className="flex-1 ml-4 max-w-32 h-1.5 rounded-full bg-white/8">
                  <div className="h-full rounded-full" style={{ width: `${pct * 2.5}%`, background: accent }} />
                </div>
              </div>
              <div className="text-[10px] text-white/35 ml-12">{desc}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border p-5 mb-8" style={{ borderColor: accent + "30", background: accent + "06" }}>
          <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: accent }}>NXT Indestructibility Guarantee</div>
          <p className="text-[12px] text-white/60 leading-relaxed">
            NXT fees are <strong className="text-white">never burned</strong>. Every fee collected from any operation — wallet transfers,
            spectral encoding, agent actions — flows to the Orbital Treasury. The supply is indestructible.
            Governance votes control bucket allocations via on-chain proposals.
          </p>
        </div>

        <div className="flex gap-3">
          <a href="https://wnsp.io/orbital-treasury" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm"
            style={{ background: accent, color: "#000" }}>
            Live Treasury Dashboard →
          </a>
          <a href="https://wnsp.io/governance" target="_blank" rel="noreferrer"
            className="flex-1 text-center py-3 rounded-xl font-bold text-sm border"
            style={{ borderColor: accent + "40", color: accent }}>
            Governance
          </a>
        </div>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── 10. 555thz.io ─ First Oscillation ────────────────────────────────────────
export function FiveFiveFiveLanding() {
  const accent = "#4ade80";
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Nav domain="555thz.io" accent={accent} />
      <div className="pt-28 pb-16 px-4 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: accent }} />
          <span className="text-[11px] uppercase tracking-widest" style={{ color: accent }}>555 THz · λ ≈ 540nm · Green</span>
        </div>
        <h1 className="text-6xl font-bold text-white mb-4">
          555 THz
        </h1>
        <p className="text-xl text-white/50 mb-4">The first unobserved oscillation.</p>
        <p className="text-sm text-white/35 mb-12 max-w-xl mx-auto leading-relaxed">
          Before anything was observed, there was oscillation. The universe's first compression event —
          the moment Λ transitioned from unformed to formed — occurred at the centre of the visible spectrum.
          555 THz. Green. The frequency at which matter first became addressable.
          This is the origin event that the Theory of Compression States describes.
          NexusOS is built on what happened next.
        </p>

        <div className="w-full h-4 rounded-full overflow-hidden mb-12" style={{
          background: "linear-gradient(to right, #7f00ff, #4400ff, #0000ff, #00aaff, #00ffcc, #00ff00, #aaff00, #ffff00, #ffaa00, #ff5500, #ff0000)"
        }} />

        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { val: "555 THz", label: "First frequency" },
            { val: "~540 nm", label: "Green wavelength" },
            { val: "Λ=hf/c²", label: "Compression law" },
          ].map(({ val, label }) => (
            <div key={label} className="rounded-xl border p-5" style={{ borderColor: accent + "25", background: accent + "08" }}>
              <div className="text-xl font-bold mb-1" style={{ color: accent }}>{val}</div>
              <div className="text-[10px] text-white/35">{label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/8 bg-white/2 p-6 mb-10 text-left">
          <div className="text-[11px] text-white/30 mb-3 uppercase tracking-widest">Theory of Compression States</div>
          <p className="text-[13px] text-white/65 leading-relaxed">
            The universe evolves from the first unobserved oscillation. Each subsequent state is a compression
            of the previous one — encoded in the electromagnetic spectrum. 25,600 orthogonal Ψ channels represent
            the full addressable state space of observable matter. NexusOS maps computation, communication, and
            energy onto this same space. When photonic hardware arrives (~2032), the software already speaks its language.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <a href="https://wnsp.io/oscillating-quanta" target="_blank" rel="noreferrer"
            className="px-8 py-3 rounded-xl font-bold text-sm"
            style={{ background: accent, color: "#000" }}>
            First Principles →
          </a>
          <a href="https://wnsp.io/compression-explorer" target="_blank" rel="noreferrer"
            className="px-8 py-3 rounded-xl font-bold text-sm border"
            style={{ borderColor: accent + "40", color: accent }}>
            Live Λ Curve
          </a>
        </div>
      </div>
      <Footer accent={accent} />
    </div>
  );
}

// ── Domain map ────────────────────────────────────────────────────────────────
export const DOMAIN_LANDINGS: Record<string, () => JSX.Element> = {
  "wnsp.dev":              WnspDevLanding,
  "www.wnsp.dev":          WnspDevLanding,
  "wnsp.blog":             WnspBlogLanding,
  "www.wnsp.blog":         WnspBlogLanding,
  "snic.io":               SnicLanding,
  "www.snic.io":           SnicLanding,
  "phr1.io":               Phr1Landing,
  "www.phr1.io":           Phr1Landing,
  "lambdagate.io":         LambdaGateLanding,
  "www.lambdagate.io":     LambdaGateLanding,
  "wavelengthscript.dev":  WavelengthScriptLanding,
  "www.wavelengthscript.dev": WavelengthScriptLanding,
  "zerogstate.io":         ZeroGStateLanding,
  "www.zerogstate.io":     ZeroGStateLanding,
  "wascii.io":             WasciiLanding,
  "www.wascii.io":         WasciiLanding,
  "orbitaltreasury.io":    OrbitalTreasuryLanding,
  "www.orbitaltreasury.io": OrbitalTreasuryLanding,
  "555thz.io":             FiveFiveFiveLanding,
  "www.555thz.io":         FiveFiveFiveLanding,
};
