import { useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Copy, Check, ChevronRight } from "lucide-react";

// ── Physics constants ──────────────────────────────────────────────────────────
const H  = 6.626e-34;   // Planck's constant  J·s
const C  = 2.998e8;     // Speed of light     m/s
const EV = 1.602e-19;   // Joule → eV

function nmToFreq(nm: number)   { return (C / (nm * 1e-9)) / 1e12; }          // THz
function nmToEnergy(nm: number) { return (H * C) / (nm * 1e-9); }             // J
function nmToEv(nm: number)     { return nmToEnergy(nm) / EV; }               // eV
function nmToLambda(nm: number) { return nmToEnergy(nm) / (C * C); }          // kg  Λ=hf/c²

function nmToBand(nm: number): { label: string; color: string } {
  if (nm < 450) return { label: "SYSTEM", color: "#8b00ff" };
  if (nm < 490) return { label: "KERNEL", color: "#2563eb" };
  if (nm < 520) return { label: "USER",   color: "#06b6d4" };
  if (nm < 565) return { label: "USER",   color: "#16a34a" };
  if (nm < 590) return { label: "USER",   color: "#ca8a04" };
  if (nm < 625) return { label: "GUEST",  color: "#ea580c" };
  return               { label: "GUEST",  color: "#dc2626" };
}

function wlToRgb(nm: number): string {
  let r = 0, g = 0, b = 0;
  if      (nm >= 380 && nm < 440) { r = -(nm-440)/60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm-440)/50;  b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm-510)/20; }
  else if (nm >= 510 && nm < 580) { r = (nm-510)/70;  g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm-645)/65; }
  else if (nm >= 645 && nm <= 780){ r = 1; }
  const dim = nm < 420 || nm > 700 ? 0.6 : 1;
  return `rgb(${Math.round(r*255*dim)},${Math.round(g*255*dim)},${Math.round(b*255*dim)})`;
}

// CE formula — canonical
function ceEncode(charCode: number): number {
  return 380 + ((charCode % 128) / 128) * 400;
}

// ── Full 128-band CE table ─────────────────────────────────────────────────────
const CE_TABLE = Array.from({ length: 128 }, (_, i) => {
  const nm   = ceEncode(i);
  const band = nmToBand(nm);
  const ch   = i >= 32 && i < 127 ? String.fromCharCode(i) : (i === 0 ? "NUL" : i === 32 ? "SPC" : `\\x${i.toString(16).padStart(2,"0")}`);
  return { code: i, ch, nm, freq: nmToFreq(nm), energy: nmToEnergy(nm), ev: nmToEv(nm), lambda: nmToLambda(nm), band };
});

// ── Telegram SVG ──────────────────────────────────────────────────────────────
function TelegramIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
    </svg>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); };
  return (
    <button onClick={copy} className="ml-2 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
      {done ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

// ── Live encoder ──────────────────────────────────────────────────────────────
function LiveEncoder() {
  const [text, setText] = useState("NexusOS");
  const chars = text.split("").slice(0, 40).map(ch => {
    const nm   = ceEncode(ch.charCodeAt(0));
    const band = nmToBand(nm);
    const wdm  = Math.floor((nm - 380) / 400 * 256) + 1;
    const oam  = Math.floor((nm - 380) / 400 * 50)  + 1;
    return { ch, nm, wdm, oam, color: wlToRgb(nm), bandColor: band.color, bandLabel: band.label };
  });
  const totalEnergy = chars.reduce((s, c) => s + nmToEnergy(c.nm), 0);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type anything…"
          maxLength={40}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-slate-500"
        />
        <span className="text-xs text-slate-600 font-mono">{text.length}/40</span>
      </div>
      {chars.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {chars.map((c, i) => (
              <div key={i} className="rounded-lg px-2 py-1.5 text-center flex-shrink-0"
                style={{ background: `${c.color}22`, border: `1px solid ${c.color}60` }}>
                <div className="text-base font-bold font-mono leading-none" style={{ color: c.color }}>
                  {c.ch === " " ? "·" : c.ch}
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">{c.nm.toFixed(0)}nm</div>
                <div className="text-[8px] font-mono mt-0.5" style={{ color: c.bandColor }}>Ψ({c.wdm},{c.oam},H)</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 pt-1 border-t border-slate-800 text-xs font-mono text-slate-500">
            <span>chars: <span className="text-slate-300">{chars.length}</span></span>
            <span>λ range: <span className="text-slate-300">{Math.min(...chars.map(c=>c.nm)).toFixed(1)}–{Math.max(...chars.map(c=>c.nm)).toFixed(1)} nm</span></span>
            <span>total E: <span className="text-slate-300">{totalEnergy.toExponential(3)} J</span></span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Spectrum bar ──────────────────────────────────────────────────────────────
function SpectrumBar() {
  const stops = Array.from({ length: 100 }, (_, i) => {
    const nm = 380 + i * 4;
    return wlToRgb(nm);
  });
  return (
    <div className="h-3 rounded-full overflow-hidden"
      style={{ background: `linear-gradient(to right,${stops.join(",")})` }} />
  );
}

export default function ProtocolPage() {
  const [tableFilter, setTableFilter] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function copySnippet(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  const filtered = CE_TABLE.filter(r =>
    !tableFilter ||
    r.ch.toLowerCase().includes(tableFilter.toLowerCase()) ||
    r.code.toString() === tableFilter ||
    r.nm.toFixed(2).includes(tableFilter) ||
    r.band.label.toLowerCase().includes(tableFilter.toLowerCase())
  );

  const NPM_CMD = "npm install nexusos-ce-encoder";
  const PIP_CMD = "pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py";
  const JS_SNIPPET = `import { ceEncode } from 'nexusos-ce-encoder';

const result = ceEncode('A');
// { wavelength: 533.59, band: 'USER', psiChannel: 'Ψ(181,35,H)', energy: 3.727e-19 }`;
  const PY_SNIPPET = `from ce_encoder import ce_encode

result = ce_encode('A')
# { 'wavelength': 533.59, 'band': 'USER', 'psi_channel': 'Ψ(181,35,H)', 'energy': 3.727e-19 }`;

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── Header ── */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <Link href="/community">
          <button className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
            ← Community
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white font-mono">WNSP·CE-SE Encoding Protocol</h1>
          <p className="text-[11px] text-slate-500 font-mono">v1.0.0 · AGPL-3.0 · genesis Ψ(228,45,H) · λ≈737.6 nm</p>
        </div>
        <a href="https://t.me/troglodytememe" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "#229ED920", color: "#229ED9", border: "1px solid #229ED940" }}>
          <TelegramIcon size={13} /> Join channel
        </a>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">

        {/* ── Protocol identity block ── */}
        <div className="rounded-xl border border-amber-800/40 bg-amber-950/10 p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-mono text-amber-400 uppercase tracking-widest">Canonical Protocol Address</p>
              <p className="text-2xl font-bold text-white font-mono">WNSP·CE-SE v1.0</p>
              <p className="text-sm text-slate-400">Wave-Navigated Spectral Protocol · Character Encoding → Spectral Encoding</p>
            </div>
            <div className="rounded-lg border border-amber-700/30 bg-amber-950/20 px-4 py-3 font-mono text-xs space-y-1">
              <div className="text-slate-500">Genesis address</div>
              <div className="text-amber-400 font-bold">Ψ(228,45,H)</div>
              <div className="text-slate-500">λ = 737.594 nm</div>
              <div className="text-slate-500">f = 406.5 THz</div>
            </div>
          </div>
          <SpectrumBar />
          <p className="text-xs text-slate-500 font-mono text-center">
            380 nm — visible spectrum — 780 nm · 128 authority bands · 3.125 nm per band
          </p>
        </div>

        {/* ── Core formula ── */}
        <div className="space-y-4">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">The Formula</p>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 space-y-6">

            <div className="text-center space-y-2">
              <p className="text-3xl font-bold font-mono text-white">λ = 380 + (n mod 128) / 128 × 400</p>
              <p className="text-sm text-slate-400">where <span className="text-white font-mono">n</span> = Unicode character code · result in nanometres</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              {[
                { label: "Range",     value: "380 – 780 nm", sub: "full visible spectrum" },
                { label: "Bands",     value: "128",          sub: "3.125 nm per band" },
                { label: "Channels",  value: "25,600",       sub: "256 WDM × 50 OAM × 2 pol" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xs text-slate-600 font-mono uppercase">{s.label}</p>
                  <p className="text-xl font-bold text-white font-mono mt-1">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Physics derivation ── */}
        <div className="space-y-4">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Physics Derivation</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { eq: "E = hf",       label: "Planck's equation",          desc: "Every character has energy. High-frequency characters (SYSTEM band) cost more to transmit. The fee system is physically derived." },
              { eq: "f = c / λ",    label: "Wave equation",              desc: "Frequency and wavelength are the same physical quantity. Wavelength addressing is frequency addressing." },
              { eq: "Λ = hf / c²",  label: "Compression density",        desc: "Einstein's E=mc² + Planck's E=hf → Λ=hf/c². A character has mass-equivalent density. Information has weight." },
              { eq: "⟨Ψᵢ|Ψⱼ⟩ = δᵢⱼ","label": "Hilbert-space orthogonality", desc: "25,600 channels are mathematically orthogonal. Zero collision — guaranteed by quantum mechanics, not software policy." },
            ].map(d => (
              <div key={d.eq} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold font-mono text-white">{d.eq}</span>
                  <span className="text-xs text-slate-500">{d.label}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Live encoder demo ── */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Live Encoder — Try It</p>
          <LiveEncoder />
        </div>

        {/* ── CE Table ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Full CE Lookup Table — 128 bands</p>
            <input
              value={tableFilter}
              onChange={e => setTableFilter(e.target.value)}
              placeholder="filter char / code / nm / band…"
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-slate-600 w-48"
            />
          </div>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="grid px-4 py-2 border-b border-slate-800 bg-slate-900/80 text-[10px] font-mono uppercase text-slate-600"
              style={{ gridTemplateColumns: "2rem 2.5rem 4rem 4rem 5rem 5rem 5rem" }}>
              <span>#</span><span>Char</span><span>λ (nm)</span><span>f (THz)</span><span>E (J)</span><span>Λ (kg)</span><span>Band</span>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/40 bg-slate-950/30">
              {filtered.map(r => (
                <div key={r.code}
                  className="grid px-4 py-1.5 text-xs hover:bg-slate-800/30 transition-colors items-center font-mono"
                  style={{ gridTemplateColumns: "2rem 2.5rem 4rem 4rem 5rem 5rem 5rem" }}>
                  <span className="text-slate-600">{r.code}</span>
                  <span className="font-bold" style={{ color: wlToRgb(r.nm) }}>{r.ch}</span>
                  <span className="text-slate-300">{r.nm.toFixed(2)}</span>
                  <span className="text-slate-400">{r.freq.toFixed(1)}</span>
                  <span className="text-slate-500">{r.energy.toExponential(3)}</span>
                  <span className="text-slate-600">{r.lambda.toExponential(2)}</span>
                  <span className="font-bold text-[10px]" style={{ color: r.band.color }}>{r.band.label}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-slate-800 text-[10px] font-mono text-slate-600">
              showing {filtered.length} of 128 bands
            </div>
          </div>
        </div>

        {/* ── Install ── */}
        <div className="space-y-4">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Install the Encoder</p>

          <div className="space-y-3">
            {/* npm */}
            <div className="rounded-xl border border-orange-800/30 bg-orange-950/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-orange-400">npm · JavaScript / TypeScript</span>
                <a href="https://www.npmjs.com/package/nexusos-ce-encoder" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                  npmjs.com <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-4 py-2.5">
                <code className="text-sm font-mono text-slate-200 flex-1">{NPM_CMD}</code>
                <button onClick={() => copySnippet("npm", NPM_CMD)}
                  className="flex-shrink-0 p-1 hover:bg-slate-700 rounded transition-colors text-slate-500 hover:text-slate-300">
                  {copied === "npm" ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                </button>
              </div>
              <div className="relative">
                <pre className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-400 overflow-x-auto">{JS_SNIPPET}</pre>
                <button onClick={() => copySnippet("js", JS_SNIPPET)}
                  className="absolute top-2 right-2 p-1 hover:bg-slate-700 rounded transition-colors text-slate-500 hover:text-slate-300">
                  {copied === "js" ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* pip */}
            <div className="rounded-xl border border-blue-800/30 bg-blue-950/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-400">pip · Python 3.8+</span>
                <a href="https://github.com/nexusosdaily-code/NexusOS/tree/main/packages/ce-encoder-py" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                  GitHub <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-4 py-2.5">
                <code className="text-xs font-mono text-slate-200 flex-1 break-all">{PIP_CMD}</code>
                <button onClick={() => copySnippet("pip", PIP_CMD)}
                  className="flex-shrink-0 p-1 hover:bg-slate-700 rounded transition-colors text-slate-500 hover:text-slate-300">
                  {copied === "pip" ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                </button>
              </div>
              <div className="relative">
                <pre className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-400 overflow-x-auto">{PY_SNIPPET}</pre>
                <button onClick={() => copySnippet("py", PY_SNIPPET)}
                  className="absolute top-2 right-2 p-1 hover:bg-slate-700 rounded transition-colors text-slate-500 hover:text-slate-300">
                  {copied === "py" ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Authority bands ── */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Authority Bands</p>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="grid px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-[10px] font-mono uppercase text-slate-600"
              style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
              <span>Band</span><span>λ range</span><span>Freq range</span><span>Fee weight</span><span>Description</span>
            </div>
            {[
              { band: "SYSTEM", color: "#8b00ff", range: "380–450 nm", freq: "667–789 THz", fee: "Highest", desc: "Protocol root · genesis zone" },
              { band: "KERNEL", color: "#2563eb", range: "450–490 nm", freq: "612–667 THz", fee: "High",    desc: "OS kernel · auth" },
              { band: "USER",   color: "#16a34a", range: "490–625 nm", freq: "480–612 THz", fee: "Standard",desc: "General communication" },
              { band: "GUEST",  color: "#dc2626", range: "625–780 nm", freq: "385–480 THz", fee: "Lowest",  desc: "Public access · read-only" },
            ].map(b => (
              <div key={b.band} className="grid px-4 py-3 border-b border-slate-800/50 text-xs items-center hover:bg-slate-800/20 transition-colors"
                style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
                <span className="font-bold font-mono" style={{ color: b.color }}>{b.band}</span>
                <span className="font-mono text-slate-300">{b.range}</span>
                <span className="font-mono text-slate-400">{b.freq}</span>
                <span className="font-mono text-slate-400">{b.fee}</span>
                <span className="text-slate-500">{b.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Links ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: TelegramIcon, color: "#229ED9", label: "Join the channel",    sub: "t.me/troglodytememe",      href: "https://t.me/troglodytememe" },
            { icon: null,         color: "#e2e8f0", label: "Source code",          sub: "github.com/nexusosdaily-code", href: "https://github.com/nexusosdaily-code/NexusOS" },
            { icon: null,         color: "#f97316", label: "npm package",          sub: "nexusos-ce-encoder",       href: "https://www.npmjs.com/package/nexusos-ce-encoder" },
          ].map((l, i) => (
            <a key={i} href={l.href} target="_blank" rel="noopener noreferrer"
              className="rounded-xl border p-4 flex items-center gap-3 hover:scale-[1.02] transition-all cursor-pointer group"
              style={{ borderColor: `${l.color}30`, background: `${l.color}08` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${l.color}20` }}>
                {l.icon ? <l.icon {...({ size: 16, className: "", style: { color: l.color } } as any)} /> : <ExternalLink size={14} style={{ color: l.color }} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">{l.label}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">{l.sub}</p>
              </div>
              <ChevronRight size={12} style={{ color: l.color }} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          ))}
        </div>

        {/* ── Footer stamp ── */}
        <div className="text-center space-y-2 pt-4 border-t border-slate-800">
          <p className="text-xs font-mono text-slate-600">
            WNSP·CE-SE v1.0.0 · AGPL-3.0 · Published 2024 · Genesis Ψ(228,45,H) · λ=737.594 nm · f=406.5 THz · Λ=4.49×10⁻⁴² kg
          </p>
          <p className="text-xs text-slate-700 font-mono">
            Derived from Einstein E=mc² + Planck E=hf → Λ=hf/c² · Defensible by physics · Open by constitution
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/community"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">Community</span></Link>
            <Link href="/constitution"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">Constitution</span></Link>
            <Link href="/hardware-lab"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">Hardware Lab</span></Link>
            <Link href="/nexus-command"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">Hub</span></Link>
          </div>
        </div>

      </div>
    </div>
  );
}
