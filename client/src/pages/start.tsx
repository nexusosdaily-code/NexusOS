import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, Copy, Check } from "lucide-react";

// ── Physics ───────────────────────────────────────────────────────────────────
const C = 2.998e8;
const H = 6.626e-34;

function ceEncode(charCode: number): number {
  return 380 + ((charCode % 128) / 128) * 400;
}
function nmToRgb(nm: number): string {
  let r = 0, g = 0, b = 0;
  if      (nm >= 380 && nm < 440) { r = -(nm-440)/60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm-440)/50;  b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm-510)/20; }
  else if (nm >= 510 && nm < 580) { r = (nm-510)/70;  g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm-645)/65; }
  else if (nm >= 645 && nm <= 780) { r = 1; }
  const d = nm < 420 || nm > 700 ? 0.6 : 1;
  return `rgb(${Math.round(r*255*d)},${Math.round(g*255*d)},${Math.round(b*255*d)})`;
}

// ── Animated typing ───────────────────────────────────────────────────────────
const DEMO_WORDS = ["hello", "light", "NexusOS", "2032", "physics", "photon"];

function TypedEncoder() {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const word = DEMO_WORDS[wordIdx];
    if (typing) {
      if (displayed.length < word.length) {
        timerRef.current = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
      } else {
        timerRef.current = setTimeout(() => setTyping(false), 1400);
      }
    } else {
      if (displayed.length > 0) {
        timerRef.current = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
      } else {
        setTyping(true);
        setWordIdx(i => (i + 1) % DEMO_WORDS.length);
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [displayed, typing, wordIdx]);

  const chars = displayed.split("").map(ch => {
    const nm = ceEncode(ch.charCodeAt(0));
    const col = nmToRgb(nm);
    const wdm = Math.floor((nm - 380) / 400 * 256) + 1;
    const oam = Math.floor((nm - 380) / 400 * 50)  + 1;
    return { ch, nm, col, wdm, oam };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 min-h-[80px] items-center justify-center">
        {chars.map((c, i) => (
          <div key={i} className="rounded-xl px-3 py-2 text-center transition-all duration-300"
            style={{ background: `${c.col}18`, border: `1px solid ${c.col}50` }}>
            <div className="text-2xl font-bold font-mono" style={{ color: c.col }}>{c.ch}</div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">{c.nm.toFixed(0)} nm</div>
            <div className="text-[9px] font-mono mt-0.5 text-slate-600">Ψ({c.wdm},{c.oam},H)</div>
          </div>
        ))}
        <div className="w-0.5 h-8 bg-slate-500 animate-pulse ml-1" />
      </div>
      <p className="text-center text-xs text-slate-600 font-mono">every character · a real wavelength of light</p>
    </div>
  );
}

// ── Spectrum strip ────────────────────────────────────────────────────────────
function SpectrumStrip() {
  const stops = Array.from({ length: 80 }, (_, i) => nmToRgb(380 + i * 5));
  return (
    <div className="h-1.5 rounded-full w-full"
      style={{ background: `linear-gradient(to right,${stops.join(",")})` }} />
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function Copyable({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm group">
      <span className="flex-1 text-slate-300">{label ?? text}</span>
      <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); }}
        className="flex-shrink-0 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors">
        {done ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-7 h-7 rounded-full border border-amber-700/50 bg-amber-950/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-amber-400 font-mono">{n}</span>
      </div>
      <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ── Telegram icon ─────────────────────────────────────────────────────────────
function TGIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StartPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Nav */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/50">
        <Link href="/community">
          <span className="text-xs text-slate-600 hover:text-slate-400 font-mono transition-colors cursor-pointer">← community</span>
        </Link>
        <span className="text-xs font-mono text-slate-700">nexusos · WNSP · CE-SE</span>
        <Link href="/protocol">
          <span className="text-xs text-slate-600 hover:text-slate-400 font-mono transition-colors cursor-pointer">spec →</span>
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 space-y-24">

        {/* ── 1. The idea ── */}
        <div className="space-y-10">
          <div className="space-y-5 text-center">
            <p className="text-xs font-mono text-amber-500 tracking-widest uppercase">If you just found this</p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
              The alphabet has always<br />
              <span className="text-amber-400">lived inside light.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto">
              We didn't invent that. Einstein and Planck did, a hundred years ago.
              We just built the infrastructure that uses it.
            </p>
          </div>
          <SpectrumStrip />
        </div>

        {/* ── 2. The formula ── */}
        <div className="space-y-6">
          <Step n={1} label="One equation. Settled physics." />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 space-y-5">
            <p className="text-center text-3xl font-bold font-mono text-white">
              E = hf &nbsp;·&nbsp; f = c/λ &nbsp;·&nbsp; Λ = hf/c²
            </p>
            <div className="grid grid-cols-3 gap-4 text-center text-xs font-mono pt-2 border-t border-slate-800">
              <div>
                <p className="text-slate-600">Planck</p>
                <p className="text-slate-300 mt-1">energy is frequency</p>
              </div>
              <div>
                <p className="text-slate-600">Maxwell</p>
                <p className="text-slate-300 mt-1">frequency is wavelength</p>
              </div>
              <div>
                <p className="text-slate-600">Einstein + Planck</p>
                <p className="text-slate-300 mt-1">information has mass</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Combine those three and you get one unavoidable result: every character in
            every message you have ever sent corresponds to a real, unique frequency of
            light. Not by convention. By physics.
          </p>
        </div>

        {/* ── 3. The live proof ── */}
        <div className="space-y-6">
          <Step n={2} label="See it happen." />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8">
            <TypedEncoder />
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            That is not a visualisation. That is the actual CE encoding running in your
            browser right now — the same algorithm published on npm and GitHub, the same
            one that will run on photonic chips when they arrive around 2032.
          </p>
        </div>

        {/* ── 4. Why now ── */}
        <div className="space-y-6">
          <Step n={3} label="Why build it now?" />
          <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
            <p>
              Silicon computers simulate light with transistors. Photonic computers
              <em> are</em> light — processors that compute by selecting wavelengths instead
              of flipping bits. They are commercially arriving around 2032.
            </p>
            <p>
              When that hardware lands, every communication system built on conventional
              addressing will need a complete rewrite. Every one built on wavelength
              addressing will already be native.
            </p>
            <p className="text-slate-300 font-medium">
              NexusOS is written in the language of the destination hardware, not the
              bridge hardware. The architecture speaks in wavelengths today so it needs
              no translation tomorrow.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 font-mono text-xs space-y-2">
            {[
              ["2024", "CE→λ mapping published · alphabet embedded in EM spectrum"],
              ["2025", "WNSP protocol · 25,600 Hilbert channels · NexusOS kernel"],
              ["2026", "npm + pip packages live · 2,200+ GitHub clones · community open"],
              ["~2032", "Photonic ASICs arrive · NexusOS runs native · no rewrite needed"],
            ].map(([yr, ev]) => (
              <div key={yr} className="flex gap-4 items-start">
                <span className="text-amber-600 flex-shrink-0 w-10">{yr}</span>
                <span className="text-slate-400">{ev}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. What to do ── */}
        <div className="space-y-6">
          <Step n={4} label="Three things you can do right now." />

          <div className="space-y-3">
            {/* Install */}
            <div className="rounded-2xl border border-orange-800/30 bg-orange-950/10 p-5 space-y-3">
              <p className="text-sm font-bold text-white">Install the encoder</p>
              <p className="text-xs text-slate-500">Encode any text to wavelength in one function call. Works in Node.js, browsers, and Python.</p>
              <Copyable text="npm install nexusos-ce-encoder" />
              <Copyable
                text="pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py"
                label="pip install nexusos-ce-encoder (Python)"
              />
            </div>

            {/* Protocol */}
            <Link href="/protocol">
              <div className="rounded-2xl border border-amber-800/20 bg-amber-950/10 p-5 flex items-center gap-4 hover:border-amber-700/40 transition-colors cursor-pointer group">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-bold text-white">Read the full specification</p>
                  <p className="text-xs text-slate-500">The formula, the full 128-band CE table, authority bands, physics derivation, and the genesis address.</p>
                </div>
                <ArrowRight size={16} className="text-amber-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </div>
            </Link>

            {/* Telegram */}
            <a href="https://t.me/troglodytememe" target="_blank" rel="noopener noreferrer">
              <div className="rounded-2xl border border-[#229ED9]/20 bg-[#229ED9]/5 p-5 flex items-center gap-4 hover:border-[#229ED9]/40 transition-colors cursor-pointer group">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-bold text-white">Join the channel</p>
                  <p className="text-xs text-slate-500">Hardware builders, physics questions, protocol discussion. Open. Free. No agenda except the 2032 photonic transition.</p>
                </div>
                <TGIcon size={18} />
              </div>
            </a>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center space-y-3 pt-4 border-t border-slate-800/50">
          <p className="text-xs font-mono text-slate-700">
            Genesis Ψ(228,45,H) · λ=737.594 nm · AGPL-3.0 · open science · open code
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link href="/community"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer font-mono">community</span></Link>
            <Link href="/protocol"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer font-mono">protocol</span></Link>
            <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors font-mono">github</a>
            <a href="https://www.npmjs.com/package/nexusos-ce-encoder" target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors font-mono">npm</a>
          </div>
        </div>

      </div>
    </div>
  );
}
