import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Play, Pause, Radio, Layers, Zap, ArrowRight, Activity,
  Video, Wifi, Globe, Lock, ChevronRight, ExternalLink,
} from "lucide-react";

// ── WASCII canonical table (202 chars, WNSP-SE v1.0) ─────────────────────────
const WASCII: Record<string, number> = {
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(65 + i), 380 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(97 + i), 383 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), 536 + i * 6])),
  " ": 596, ".": 602, ",": 608, "!": 614, "?": 620, ":": 626, ";": 632,
  "-": 638, "_": 644, "/": 650, "\\": 656, "@": 662, "#": 668, "$": 674,
  "%": 680, "&": 686, "*": 692, "(": 698, ")": 704, "[": 710, "]": 716,
  "{": 722, "}": 728, "|": 734, "<": 740, ">": 746, "=": 752, "+": 758,
  "λ": 790, "Λ": 839, "ψ": 823, "Ψ": 854, "π": 802,
  "α": 760, "β": 763, "γ": 766, "δ": 769, "σ": 814, "Σ": 848, "Ω": 857,
};
const h = 6.626e-34, c_light = 299_792_458;

function wasciiNm(char: string): number {
  return WASCII[char] ?? (380 + (char.charCodeAt(0) % 256) / 255 * 400);
}
function nmToHsl(nm: number): string {
  const clipped = Math.min(Math.max(nm, 380), 780);
  const hue = Math.round(270 - ((clipped - 380) / 400) * 270);
  if (nm < 350) return "hsl(280, 70%, 30%)";
  if (nm > 900) return "hsl(220, 30%, 15%)";
  return `hsl(${hue}, 80%, 45%)`;
}
function frameEnergy(nm: number) {
  const f = c_light / (nm * 1e-9);
  return h * f;
}
function psChannel(nm: number) {
  const wdm = Math.round((nm - 380) / 0.016); // 0.016 nm resolution → 25600 channels
  const oam = wdm % 64;
  const pol = wdm % 2 === 0 ? "H" : "V";
  return { wdm: Math.min(wdm, 25599), oam, pol, notation: `Ψ(${Math.min(wdm, 25599)},${oam},${pol})` };
}

// ── Video streaming modes ─────────────────────────────────────────────────────
const STREAM_MODES = [
  {
    id: "unicast",
    label: "Unicast",
    color: "from-blue-600 to-cyan-600",
    channels: 1,
    desc: "One viewer · single Ψ channel · dedicated λ address",
    tcpEquiv: "Dedicated TCP connection + CDN edge",
  },
  {
    id: "adaptive",
    label: "Adaptive Bitrate",
    color: "from-purple-600 to-pink-600",
    channels: 4,
    desc: "3 quality tiers · 4 orthogonal Ψ channels · no collision",
    tcpEquiv: "HLS/DASH manifest + 3× CDN segment tracks",
  },
  {
    id: "multicast",
    label: "Spectral Multicast",
    color: "from-amber-500 to-orange-600",
    channels: 8,
    desc: "Unlimited viewers · single emission · receivers tune their Ψ channel",
    tcpEquiv: "Impossible on TCP/IP — requires separate unicast per viewer",
  },
];

// ── Comparison table data ─────────────────────────────────────────────────────
const COMPARISON = [
  { aspect: "Addressing",  tcp: "IP:Port (arbitrary numbers)", wnsp: "Canonical wavelength (physics)" },
  { aspect: "Routing",    tcp: "BGP hops, CDN edge nodes",     wnsp: "Spectral emission — no routing" },
  { aspect: "Quality tiers", tcp: "Multiple files/manifests (HLS/DASH)", wnsp: "Orthogonal Ψ channels, same transmission" },
  { aspect: "Multicast",  tcp: "Unicast per viewer (bandwidth scales linearly)", wnsp: "Single emission, receivers tune to channel" },
  { aspect: "Encryption", tcp: "TLS overlay (separate protocol)", wnsp: "Polarisation + OAM encode naturally" },
  { aspect: "Congestion", tcp: "TCP backoff, buffering, rebuffering", wnsp: "Channel isolation — no interference" },
  { aspect: "Proof of delivery", tcp: "ACK packets", wnsp: "γ coherence check per frame" },
  { aspect: "Energy cost", tcp: "Opaque (electricity bill)", wnsp: "E=hf per byte, exact and auditable" },
];

export default function SpectralVideoPage() {
  const [inputText, setInputText] = useState("NEXUS VIDEO STREAM — FRAME 001");
  const [frames, setFrames] = useState<any[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamPos, setStreamPos] = useState(0);
  const [mode, setMode] = useState("adaptive");
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [psqToken, setPsqToken] = useState("");
  const streamRef = useRef<NodeJS.Timeout | null>(null);

  // Encode text → WnspFrames
  const encode = useCallback((text: string) => {
    const result = Array.from(text).map((ch, i) => {
      const nm = wasciiNm(ch);
      const f = c_light / (nm * 1e-9);
      const E = h * f;
      const ch_info = psChannel(nm);
      return {
        idx: i, symbol: ch, nm, f, E,
        lm: E / (c_light * c_light),
        checksum: (ch.charCodeAt(0) ^ Math.round(nm)) % 256,
        payload_bit: i % 2,
        wascii: ch in WASCII,
        ...ch_info,
      };
    });
    const nms = result.map(r => r.nm);
    const mean = nms.reduce((a, b) => a + b, 0) / nms.length;
    const std = Math.sqrt(nms.map(n => (n - mean) ** 2).reduce((a, b) => a + b, 0) / nms.length);
    const gamma = 1 - std / mean;
    const hash = btoa(text.slice(0, 18)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24).toUpperCase();
    const total = result.reduce((s, r) => s + r.E, 0);
    setFrames(result);
    setTotalEnergy(total);
    setPsqToken(`PSQ-${hash.padEnd(24, "0")}-TTL10`);
    return { result, gamma };
  }, []);

  useEffect(() => { encode(inputText); }, []);

  // Streaming animation
  useEffect(() => {
    if (streaming) {
      streamRef.current = setInterval(() => {
        setStreamPos(p => (p + 1) % Math.max(frames.length, 1));
      }, 120);
    } else {
      if (streamRef.current) clearInterval(streamRef.current);
    }
    return () => { if (streamRef.current) clearInterval(streamRef.current); };
  }, [streaming, frames.length]);

  const selectedMode = STREAM_MODES.find(m => m.id === mode)!;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950" />
        {/* spectrum bar */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          {Array.from({ length: 80 }, (_, i) => {
            const nm = 380 + (i / 79) * 400;
            return <div key={i} style={{ flex: 1, background: nmToHsl(nm) }} />;
          })}
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/nexus-command" className="text-gray-500 hover:text-gray-300 text-sm">Nexus Command</Link>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <span className="text-gray-300 text-sm">Spectral Video</span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
              <Video className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono px-2 py-1 rounded bg-purple-900/40 text-purple-300">WNSP-SE v1.0 · AGPL-3.0</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
            Spectral Video Streaming
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mb-6">
            A video file is bytes. Bytes are characters. Characters have canonical wavelengths.
            So a video is a spectral signal — not a packet queue. This is the WNSP philosophy applied to video.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" />Every byte → exact E=hf cost</span>
            <span className="flex items-center gap-1.5"><Radio className="w-4 h-4 text-cyan-400" />Every stream → unique Ψ channel</span>
            <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-green-400" />Polarisation replaces TLS</span>
            <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-purple-400" />No CDN, no routing, just physics</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* ── Paradigm comparison ── */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gray-900/60 border-red-900/40 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h2 className="font-bold text-red-300">Current Tech: TCP/IP Video</h2>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              {[
                "Video encoded as H.264/H.265 binary chunks",
                "Chunks wrapped in TCP packets with IP headers",
                "Routed through BGP hops across the internet",
                "CDN edge nodes cache and re-serve content",
                "HLS/DASH manifest describes multiple quality files",
                "Each viewer needs their own unicast stream",
                "TLS encryption bolted on as a separate layer",
                "Congestion → buffering → rebuffering",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-gray-900/60 border-green-900/40 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <h2 className="font-bold text-green-300">WNSP: Spectral Video</h2>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              {[
                "Video bytes encoded as WASCII WnspFrames",
                "Each byte gets a canonical wavelength address",
                "No routing — channel address IS the destination",
                "No CDN — spectral emission reaches all tuned receivers",
                "Quality tiers = orthogonal Ψ channels, same emission",
                "Multicast is native — receivers tune their Ψ channel",
                "Polarisation (H/V) + OAM encode privacy naturally",
                "Coherence γ ≥ 0.70 validates every transmission",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Live encoder ── */}
        <Card className="bg-gray-900/60 border-gray-700 p-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Spectral Encoder — Video Bytes as WnspFrames
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Type or paste any content below. Every character is instantly mapped to its canonical WASCII wavelength
            and assigned a unique Ψ channel — exactly how a video stream would be encoded.
          </p>
          <div className="flex gap-3 mb-4">
            <Textarea
              data-testid="input-video-content"
              value={inputText}
              onChange={e => { setInputText(e.target.value); encode(e.target.value); }}
              placeholder="Paste video metadata, stream header, or any content…"
              className="bg-gray-800 border-gray-600 text-white font-mono text-sm flex-1 min-h-[80px]"
            />
          </div>

          {/* Spectrum strip */}
          {frames.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">Character spectrum — each tile = one WnspFrame</span>
                <Button
                  data-testid="button-stream-toggle"
                  size="sm"
                  onClick={() => setStreaming(s => !s)}
                  className={`ml-auto h-7 text-xs ${streaming ? "bg-red-700 hover:bg-red-600" : "bg-green-700 hover:bg-green-600"}`}
                >
                  {streaming ? <><Pause className="w-3 h-3 mr-1" />Stop</> : <><Play className="w-3 h-3 mr-1" />Stream</>}
                </Button>
              </div>
              <div className="flex gap-0.5 flex-wrap">
                {frames.map((f, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold text-white border transition-all duration-75 ${
                      streaming && i === streamPos
                        ? "border-white scale-110 z-10 shadow-lg"
                        : "border-white/10"
                    }`}
                    style={{ background: nmToHsl(f.nm) }}
                    title={`'${f.symbol}' → ${f.nm}nm | ${f.notation} | E=${f.E.toExponential(2)}J | chk=${f.checksum}`}
                  >
                    {f.symbol === " " ? "·" : f.symbol}
                  </div>
                ))}
              </div>

              {/* PSQ + stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-400">Bytes / Frames</div>
                  <div className="text-white font-bold">{frames.length}</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-400">Total Energy</div>
                  <div className="text-purple-300 font-mono text-sm">{totalEnergy.toExponential(3)} J</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-400">WASCII defined</div>
                  <div className="text-green-300 font-bold">{frames.filter(f => f.wascii).length}/{frames.length}</div>
                </div>
                <div className="p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                  <div className="text-xs text-gray-400 mb-1">PSQ Token</div>
                  <div className="text-cyan-300 font-mono text-[9px] break-all">{psqToken}</div>
                </div>
              </div>

              {/* Frame table (first 10) */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="py-2 text-left">#</th>
                      <th className="py-2 text-left">byte</th>
                      <th className="py-2 text-left">λ (nm)</th>
                      <th className="py-2 text-left">Ψ channel</th>
                      <th className="py-2 text-left">pol</th>
                      <th className="py-2 text-left">E (J)</th>
                      <th className="py-2 text-left">Λm (kg)</th>
                      <th className="py-2 text-left">chk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frames.slice(0, 12).map((f) => (
                      <tr
                        key={f.idx}
                        className={`border-b border-gray-800 transition-colors ${streaming && f.idx === streamPos ? "bg-white/5" : "hover:bg-gray-800/30"}`}
                        data-testid={`video-frame-row-${f.idx}`}
                      >
                        <td className="py-1.5 text-gray-500">{f.idx}</td>
                        <td className="py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-sm" style={{ background: nmToHsl(f.nm) }} />
                            <span className="font-mono text-cyan-300">{f.symbol === " " ? "·" : f.symbol}</span>
                          </div>
                        </td>
                        <td className="py-1.5 text-white">{f.nm.toFixed(1)}</td>
                        <td className="py-1.5 font-mono text-purple-300">{f.notation}</td>
                        <td className="py-1.5 text-yellow-300">{f.pol}</td>
                        <td className="py-1.5 text-gray-400">{f.E.toExponential(2)}</td>
                        <td className="py-1.5 text-gray-500">{f.lm.toExponential(2)}</td>
                        <td className="py-1.5 text-amber-300">{f.checksum}</td>
                      </tr>
                    ))}
                    {frames.length > 12 && (
                      <tr>
                        <td colSpan={8} className="py-2 text-center text-gray-500 text-xs">
                          … {frames.length - 12} more frames
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        {/* ── Streaming modes ── */}
        <div>
          <h2 className="text-xl font-bold mb-2">Three Streaming Modes</h2>
          <p className="text-gray-400 text-sm mb-5">
            Unlike TCP/IP where each new quality tier or viewer requires separate infrastructure,
            WNSP handles all three with orthogonal Ψ channels — occupying the same physical space
            without interference.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {STREAM_MODES.map(m => (
              <button
                key={m.id}
                data-testid={`mode-card-${m.id}`}
                onClick={() => setMode(m.id)}
                className={`p-5 rounded-xl border text-left transition-all ${
                  mode === m.id
                    ? "border-white/30 bg-gray-800/60"
                    : "border-gray-700 bg-gray-900/40 hover:border-gray-600"
                }`}
              >
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r ${m.color} text-white text-xs font-bold mb-3`}>
                  <Wifi className="w-3 h-3" /> {m.label}
                </div>
                <div className="text-sm text-gray-200 mb-2">{m.desc}</div>
                <div className="text-xs text-gray-500">{m.channels} Ψ channel{m.channels > 1 ? "s" : ""}</div>
              </button>
            ))}
          </div>

          {/* Mode detail */}
          <Card className="bg-gray-900/60 border-gray-700 p-5">
            <h3 className={`font-bold mb-3 bg-gradient-to-r ${selectedMode.color} bg-clip-text text-transparent`}>
              {selectedMode.label} — Channel Layout
            </h3>
            <div className="flex gap-1 flex-wrap mb-4">
              {Array.from({ length: selectedMode.channels }, (_, i) => {
                const baseNm = 420 + i * 60;
                const ch = psChannel(baseNm);
                return (
                  <div key={i} className="flex-1 min-w-[120px] p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-sm" style={{ background: nmToHsl(baseNm) }} />
                      <span className="text-xs font-mono text-purple-300">{ch.notation}</span>
                    </div>
                    <div className="text-xs text-gray-400">{baseNm}nm</div>
                    <div className="text-xs text-gray-500">
                      {selectedMode.id === "adaptive"
                        ? ["4K 120fps", "1080p 60fps", "720p 30fps", "360p buffer"][i] ?? `Track ${i}`
                        : selectedMode.id === "multicast"
                        ? `Viewer region ${i + 1}`
                        : "Primary stream"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-gray-500 bg-gray-800/40 rounded p-3 font-mono">
              <span className="text-gray-400">TCP/IP equivalent: </span>
              <span className="text-red-300">{selectedMode.tcpEquiv}</span>
            </div>
          </Card>
        </div>

        {/* ── Full comparison table ── */}
        <Card className="bg-gray-900/60 border-gray-700 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            TCP/IP vs WNSP Spectral — Full Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-3 text-left text-gray-400 w-1/4">Aspect</th>
                  <th className="py-3 text-left text-red-400 w-[37.5%]">TCP/IP (Current)</th>
                  <th className="py-3 text-left text-green-400 w-[37.5%]">WNSP Spectral</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/20">
                    <td className="py-3 text-gray-300 font-medium">{row.aspect}</td>
                    <td className="py-3 text-gray-400">{row.tcp}</td>
                    <td className="py-3 text-gray-200">{row.wnsp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Why this is practical now ── */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-purple-800/30 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Why This Is Practical Now
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                title: "The alphabet is proved",
                body: "Block #4 on-chain: 'angry birds' 25MB at Ψ(211,35,H) 534.51nm. WASCII is live. 479 spectral records in the database. The encoding layer exists and works.",
              },
              {
                title: "The channel model is defined",
                body: "25,600 orthogonal Hilbert-space channels. WDM index × OAM mode × polarisation. No collision. Any video stream gets a unique physical address.",
              },
              {
                title: "Energy cost is exact",
                body: "E=hf per byte. A 25MB video at 534.51nm costs a calculable number of joules. Not an arbitrary fee — the physics of the transmission. This is auditable on-chain.",
              },
              {
                title: "Hardware roadmap is in motion",
                body: "PHR-1 resonator, Lambda Gate InP ASIC, free-space transceivers — the crowdfund is building the physical layer. The software stack is complete. Hardware is the gap.",
              },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="font-semibold text-white flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                  {item.title}
                </div>
                <p className="text-gray-400 text-sm pl-6">{item.body}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Links ── */}
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/evidence",      label: "Evidence Ledger", icon: <Activity className="w-4 h-4" /> },
            { href: "/crowdfund",     label: "Fund Hardware R&D", icon: <Zap className="w-4 h-4" /> },
            { href: "/wnsp-coordinator", label: "WNSP Coordinator", icon: <Radio className="w-4 h-4" /> },
            { href: "/photonic-dev",  label: "Photonic Dev Env", icon: <Layers className="w-4 h-4" /> },
            { href: "/network",       label: "Spectral Network", icon: <Globe className="w-4 h-4" /> },
          ].map(l => (
            <Link key={l.href} href={l.href}>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 bg-gray-900/50 hover:border-gray-500 text-sm text-gray-300 hover:text-white transition-all">
                {l.icon} {l.label} <ExternalLink className="w-3 h-3 text-gray-500" />
              </button>
            </Link>
          ))}
        </div>

        <p className="text-center text-gray-600 text-xs pb-8">
          WNSP Spectral Video · AGPL-3.0 Open Infrastructure · NexusOS 2025–2125
        </p>
      </div>
    </div>
  );
}
