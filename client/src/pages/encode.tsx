import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { Copy, Check, Zap, ArrowRight, Share2 } from "lucide-react";

// ── Client-side CE physics (no login, instant) ───────────────────────────────
const MIN_NM = 380, MAX_NM = 780, BANDS = 128;
const BAND_W = (MAX_NM - MIN_NM) / BANDS;
const H = 6.626e-34, C = 2.998e8;

function wlToHex(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) { r = 1; }
  const ri = Math.round(r * 255), gi = Math.round(g * 255), bi = Math.round(b * 255);
  return `#${ri.toString(16).padStart(2,"0")}${gi.toString(16).padStart(2,"0")}${bi.toString(16).padStart(2,"0")}`;
}

function ceEncodeClient(text: string) {
  const tokens = Array.from(text.slice(0, 200)).map(ch => {
    const band = ch.charCodeAt(0) % BANDS;
    const nm   = MIN_NM + (band + 0.5) * BAND_W;
    return { ch, band, nm: Math.round(nm * 100) / 100, hex: wlToHex(nm) };
  });
  const midNm = tokens.length ? tokens.reduce((s, t) => s + t.nm, 0) / tokens.length : 550;
  const freq  = C / (midNm * 1e-9);
  const energy = H * freq;
  return { tokens, midNm: Math.round(midNm * 100) / 100, freq, energy };
}

function bandToPsi(band: number) {
  const wdm = (band % 256) + 1;
  const oam = (band % 50) + 1;
  return `Ψ(${wdm},${oam},H)`;
}

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors">
      {c ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
      {c ? "Copied!" : label}
    </button>
  );
}

export default function EncodePage() {
  const params = new URLSearchParams(window.location.search);
  const initialText = params.get("text") ?? "";
  const [input, setInput]     = useState(initialText);
  const [result, setResult]   = useState<ReturnType<typeof ceEncodeClient> | null>(null);
  const [apiResult, setApiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  function encode(text: string) {
    if (!text.trim()) { setResult(null); setApiResult(null); return; }
    setResult(ceEncodeClient(text));
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/encode?text=${encodeURIComponent(text.slice(0, 1000))}`);
        if (r.ok) setApiResult(await r.json());
      } catch { /* silent */ } finally { setLoading(false); }
    }, 600);
  }

  useEffect(() => { if (initialText) encode(initialText); }, []);

  function onInput(v: string) { setInput(v); encode(v); }

  const shareUrl = input.trim()
    ? `${window.location.origin}/encode?text=${encodeURIComponent(input.trim())}`
    : window.location.href;

  const midBand = result ? Math.round((result.midNm - MIN_NM) / BAND_W) : 64;
  const midHex  = result ? wlToHex(result.midNm) : "#888";

  return (
    <div className="min-h-screen bg-black text-white font-mono">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-black/85 backdrop-blur">
        <Link href="/">
          <span className="text-sm font-bold tracking-widest" style={{ color: midHex }}>
            NEXUS<span className="text-white">OS</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/ce-se-pipeline">
            <span className="text-[11px] text-white/35 hover:text-white transition-colors cursor-pointer">Full Pipeline →</span>
          </Link>
          <Link href="/auth">
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 transition-colors cursor-pointer">Enter OS</span>
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">

        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 text-[10px] text-white/40 uppercase tracking-widest mb-4">
            <Zap size={10} style={{ color: midHex }} /> CE→SE Spectral Encoder
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Every character has a <span style={{ color: midHex }}>wavelength.</span>
          </h1>
          <p className="text-sm text-white/35">
            Paste any code, any text, any language. Get its spectral fingerprint.
            Share the link — anyone can see it instantly.
          </p>
        </div>

        {/* Input */}
        <div className="rounded-xl border border-white/10 bg-white/2 overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/6">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Input — any language</span>
            <span className="text-[10px] text-white/20">{input.length}/1000</span>
          </div>
          <textarea
            value={input}
            onChange={e => onInput(e.target.value)}
            placeholder={"def hello():\n    print('Hello World')\n\n// or JavaScript, Rust, Python, C++ — anything"}
            className="w-full h-36 bg-transparent text-[12px] text-white/75 p-4 resize-none outline-none leading-relaxed"
            data-testid="input-encode-text"
          />
        </div>

        {/* Spectrum bar */}
        {result && (
          <div className="mb-5">
            <div className="w-full h-2.5 rounded-full overflow-hidden mb-1" style={{
              background: "linear-gradient(to right,#7f00ff,#4400ff,#0000ff,#00aaff,#00ffcc,#00ff00,#aaff00,#ffff00,#ffaa00,#ff5500,#ff0000)"
            }} />
            <div className="relative" style={{ paddingLeft: `${(midBand / 128) * 100}%` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: midHex }} />
            </div>
          </div>
        )}

        {/* Character chips */}
        {result && result.tokens.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-white/2 p-4 mb-5">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
              Character map — {result.tokens.length} tokens encoded
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.tokens.slice(0, 80).map((t, i) => (
                <div key={i} title={`'${t.ch}' → band ${t.band} → ${t.nm}nm`}
                  className="flex items-center justify-center w-7 h-7 rounded text-[10px] font-bold text-black"
                  style={{ background: t.hex }}>
                  {t.ch === " " ? "·" : t.ch === "\n" ? "↵" : t.ch}
                </div>
              ))}
              {result.tokens.length > 80 && (
                <div className="flex items-center justify-center px-2 h-7 rounded text-[10px] text-white/30 border border-white/8">
                  +{result.tokens.length - 80} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spectral result */}
        {result && (
          <div className="rounded-xl border p-5 mb-5" style={{ borderColor: midHex + "30", background: midHex + "08" }}>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-4">
              {[
                { label: "Wavelength (mid)", value: `${result.midNm} nm` },
                { label: "Band", value: `${midBand} / 128` },
                { label: "Ψ Channel", value: apiResult?.psi_channel ?? bandToPsi(midBand) },
                { label: "Frequency", value: `${(result.freq / 1e12).toFixed(2)} THz` },
                { label: "Energy", value: `${result.energy.toExponential(3)} J` },
                { label: "Tokens", value: result.tokens.length.toString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[10px] text-white/30 mb-0.5">{label}</div>
                  <div className="text-[13px] font-bold" style={{ color: midHex }}>{value}</div>
                </div>
              ))}
            </div>

            {/* API enrichment */}
            {apiResult && (
              <div className="border-t border-white/8 pt-3 mt-1">
                <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                  <div><span className="text-white/30">WL start: </span><span className="text-white/70">{apiResult.wavelength_start_nm} nm</span></div>
                  <div><span className="text-white/30">WL end: </span><span className="text-white/70">{apiResult.wavelength_end_nm} nm</span></div>
                  <div><span className="text-white/30">Frames: </span><span className="text-white/70">{apiResult.frame_count}</span></div>
                  <div><span className="text-white/30">CE tokens: </span><span className="text-white/70">{apiResult.ce_token_count}</span></div>
                </div>
              </div>
            )}
            {loading && !apiResult && (
              <div className="border-t border-white/8 pt-3 mt-1 text-[10px] text-white/25">Fetching full spectral analysis…</div>
            )}
          </div>
        )}

        {/* Share link */}
        {result && (
          <div className="rounded-xl border border-white/8 bg-white/2 p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[10px] text-white/40">
                <Share2 size={10} /> Shareable link — anyone can open this, no login needed
              </div>
              <CopyBtn text={shareUrl} label="Copy link" />
            </div>
            <div className="text-[11px] text-white/50 break-all">{shareUrl}</div>
          </div>
        )}

        {/* API badge */}
        {result && (
          <div className="rounded-xl border border-white/6 bg-white/1 p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/30 uppercase tracking-widest">API access — no auth</span>
              <CopyBtn text={`https://wnsp.io/api/encode?text=${encodeURIComponent(input.trim())}`} label="Copy URL" />
            </div>
            <pre className="text-[11px] text-white/55 break-all whitespace-pre-wrap">
{`GET https://wnsp.io/api/encode?text=${encodeURIComponent(input.trim().slice(0, 60))}${input.length > 60 ? "…" : ""}`}
            </pre>
          </div>
        )}

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/ce-se-pipeline">
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm cursor-pointer transition-colors"
              style={{ background: midHex, color: "#000" }}>
              Full CE→SE Pipeline <ArrowRight size={14} />
            </div>
          </Link>
          <a href="https://wnsp.dev" target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border transition-colors"
            style={{ borderColor: midHex + "40", color: midHex }}>
            Developer Docs
          </a>
        </div>

        {/* Empty state */}
        {!result && (
          <div className="text-center py-12 text-white/20">
            <div className="text-4xl mb-3">λ</div>
            <div className="text-sm">Paste any text or code above to see its spectral fingerprint</div>
            <div className="text-[11px] mt-2 text-white/15">
              Try: <button className="hover:text-white/40 transition-colors" onClick={() => onInput("Hello World")}>Hello World</button>
              {" · "}
              <button className="hover:text-white/40 transition-colors" onClick={() => onInput("def add(a, b):\n    return a + b")}>Python function</button>
              {" · "}
              <button className="hover:text-white/40 transition-colors" onClick={() => onInput("const x = 42;")}>JavaScript</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
