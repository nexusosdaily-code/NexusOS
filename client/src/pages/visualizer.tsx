import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

function wavelengthToRgb(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; g = 0; b = 1; }
  else if (nm >= 440 && nm < 490) { r = 0; g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { r = 0; g = 1; b = -(nm - 510) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; b = 0; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; b = 0; }
  else if (nm >= 645 && nm <= 780) { r = 1; g = 0; b = 0; }
  let f = 1.0;
  if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
  if (nm > 700) f = 0.3 + 0.7 * (780 - nm) / 80;
  return `rgb(${Math.round(r * 255 * f)},${Math.round(g * 255 * f)},${Math.round(b * 255 * f)})`;
}

const WASCII: Record<string, number> = {
  A:380,B:386,C:392,D:398,E:404,F:410,G:416,H:422,I:428,J:434,K:440,L:446,M:452,
  N:458,O:464,P:470,Q:476,R:482,S:488,T:494,U:500,V:506,W:512,X:518,Y:524,Z:530,
  a:383,b:389,c:395,d:401,e:407,f:413,g:419,h:425,i:431,j:437,k:443,l:449,m:455,
  n:461,o:467,p:473,q:479,r:485,s:491,t:497,u:503,v:509,w:515,x:521,y:527,z:533,
  "0":536,"1":542,"2":548,"3":554,"4":560,"5":566,"6":572,"7":578,"8":584,"9":590,
  " ":596,
};

const WORD = "NexusOS";
const WORD_FRAMES = WORD.split("").map((ch, i) => {
  const nm = WASCII[ch] ?? 500;
  const f = 3e8 / (nm * 1e-9);
  const E = 6.626e-34 * f;
  return { ch, nm, freq: f, energy: E, color: wavelengthToRgb(nm), idx: i };
});

const LAYERS = [
  { id:"L0", label:"Alphabet Substrate", sub:"PROVED Nov 2025 · A=380nm Z=530nm", color:"#9333ea", bg:"rgba(147,51,234,0.12)" },
  { id:"L1", label:"Spectral DB & Addressing", sub:"620+ records · 51,200 Ψ channels · E=hf cost", color:"#3b82f6", bg:"rgba(59,130,246,0.12)" },
  { id:"L2", label:"Blockchain Proof", sub:"Λ=hf/c² blocks · SHA-256 audit · AGPL", color:"#06b6d4", bg:"rgba(6,182,212,0.12)" },
  { id:"L3", label:"Agent Intelligence", sub:"6 WNSP kernel agents · KernelEventBus SSE", color:"#10b981", bg:"rgba(16,185,129,0.12)" },
  { id:"L4", label:"Constitutional Economy", sub:"NXT ordinal economy · Orbital Treasury", color:"#f59e0b", bg:"rgba(245,158,11,0.12)" },
  { id:"L5", label:"Spectral Network Discovery", sub:"P2P nodes · Physics IS the address · No DNS", color:"#f97316", bg:"rgba(249,115,22,0.12)" },
];

const NODES = [
  { id:"WASCII",   label:"WASCII v1.0",    sub:"202 chars",      angle:0,   r:160, color:"#9333ea" },
  { id:"BLOCKCHAIN",label:"Blockchain",    sub:"5 blocks",       angle:60,  r:160, color:"#06b6d4" },
  { id:"AGENTS",   label:"6 Agents",       sub:"Ψ channels",     angle:120, r:160, color:"#10b981" },
  { id:"NETWORK",  label:"Spectral Nodes", sub:"L5 discovery",   angle:180, r:160, color:"#f97316" },
  { id:"WALLET",   label:"NXT Wallet",     sub:"500M balance",   angle:240, r:160, color:"#f59e0b" },
  { id:"SDK",      label:"Live API SDK",   sub:"7 endpoints",    angle:300, r:160, color:"#3b82f6" },
];

function toXY(angleDeg: number, r: number, cx=200, cy=200) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function WaveCanvas({ freq, amplitude, color, label }:
  { freq: number; amplitude: number; color: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const tRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const phase = (x / W) * freq * Math.PI * 2 + tRef.current;
        const y = H / 2 + Math.sin(phase) * amplitude;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.stroke();
      tRef.current += 0.04;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [freq, amplitude, color]);
  return (
    <div className="relative">
      <canvas ref={canvasRef} width={340} height={80} className="w-full" />
      <div className="absolute top-1 left-2 text-xs font-mono" style={{ color }}>{label}</div>
    </div>
  );
}

export default function VisualizerPage() {
  const [activeFrame, setActiveFrame] = useState(0);
  const [activeLayer, setActiveLayer] = useState(0);
  const [particlePhase, setParticlePhase] = useState(0);
  const [glowIdx, setGlowIdx] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setActiveFrame(f => (f + 1) % WORD_FRAMES.length);
    }, 900);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setActiveLayer(l => (l + 1) % LAYERS.length);
    }, 1400);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setParticlePhase(p => (p + 1) % 100);
      setTick(t => t + 1);
    }, 50);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setGlowIdx(g => (g + 1) % NODES.length);
    }, 1200);
    return () => clearInterval(iv);
  }, []);

  const frame = WORD_FRAMES[activeFrame];
  const specPos = (frame.nm - 380) / (780 - 380); // 0..1

  const pulseScale = 1 + 0.04 * Math.sin(tick * 0.1);

  return (
    <div style={{ background: "#000008", minHeight: "100vh", fontFamily: "monospace", color: "#e2e8f0", overflowX: "hidden" }}>
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes pulse-glow { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes beam { 0% { opacity:0; } 50% { opacity:1; } 100% { opacity:0; } }
        @keyframes rise { 0% { transform:translateY(20px); opacity:0; } 100% { transform:translateY(0); opacity:1; } }
        @keyframes scanline { 0% { top:0%; } 100% { top:100%; } }
        .float { animation: float 3s ease-in-out infinite; }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .rise { animation: rise 0.5s ease-out forwards; }
        .layer-bar { transition: all 0.4s ease; }
      `}</style>

      {/* ── NAV ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/nexus-command">
          <span style={{ color: "#9333ea", fontSize: 13, cursor: "pointer" }}>← Nexus Command</span>
        </Link>
        <span style={{ color: "#475569", fontSize: 12 }}>|</span>
        <span style={{ color: "#64748b", fontSize: 12 }}>NexusOS · Live System Animation</span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — Λ = hf/c²
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ textAlign: "center", padding: "64px 24px 48px", position: "relative" }}>
        {/* Radial glow behind equation */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 400, height: 200,
          background: "radial-gradient(ellipse, rgba(147,51,234,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="float" style={{
          fontSize: "clamp(48px, 8vw, 88px)",
          fontWeight: 900,
          letterSpacing: "-2px",
          background: "linear-gradient(135deg, #e2e8f0 0%, #9333ea 40%, #3b82f6 70%, #06b6d4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 16,
          textShadow: "none",
          transform: `scale(${pulseScale})`,
          display: "inline-block",
        }}>
          Λ = hf/c²
        </div>

        <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>
          Lambda Boson Core Equation · The physics foundation of NexusOS
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, fontSize: 12, color: "#475569" }}>
          <span>h = 6.626×10⁻³⁴ J·s</span>
          <span>c = 2.998×10⁸ m/s</span>
          <span>Z₀ = 376.73 Ω</span>
          <span>f₀ = 555 THz</span>
          <span>f_r = 7.83 Hz</span>
        </div>

        {/* Spectrum bar */}
        <div style={{ maxWidth: 700, margin: "32px auto 0", position: "relative" }}>
          <div style={{
            height: 16, borderRadius: 8,
            background: "linear-gradient(to right, #4b0082,#8b00ff,#0000ff,#00ffff,#00ff00,#ffff00,#ff8000,#ff0000)",
            boxShadow: "0 0 24px rgba(147,51,234,0.4)",
            position: "relative",
          }}>
            {/* Cursor on spectrum for active character */}
            <div style={{
              position: "absolute",
              left: `${specPos * 100}%`,
              top: -20, transform: "translateX(-50%)",
              transition: "left 0.5s ease",
            }}>
              <div style={{
                background: frame.color,
                color: "#000",
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 11,
                fontWeight: 700,
                boxShadow: `0 0 12px ${frame.color}`,
                whiteSpace: "nowrap",
              }}>
                '{frame.ch}' {frame.nm}nm
              </div>
              <div style={{
                width: 2, height: 24, background: frame.color,
                margin: "0 auto",
                boxShadow: `0 0 8px ${frame.color}`,
              }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "#475569" }}>
            <span>380nm · UV</span><span>450nm · Violet</span><span>520nm · Green</span>
            <span>590nm · Yellow</span><span>650nm · Red</span><span>780nm · IR</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SCENE 1 — CE → SE ENCODING PIPELINE
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 900, margin: "0 auto 64px", padding: "0 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#9333ea", letterSpacing: 3, marginBottom: 6 }}>SCENE 01</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Character Encoding Pipeline</h2>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            Every symbol → physical wavelength → WnspFrame → Ψ channel. Real WASCII v1.0 canonical wavelengths.
          </div>
        </div>

        {/* Word display */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {WORD_FRAMES.map((f, i) => (
            <div key={i} style={{
              border: `1px solid ${i === activeFrame ? f.color : "rgba(255,255,255,0.08)"}`,
              borderRadius: 8,
              padding: "8px 14px",
              background: i === activeFrame ? `${f.color}20` : "rgba(255,255,255,0.02)",
              transition: "all 0.3s ease",
              boxShadow: i === activeFrame ? `0 0 20px ${f.color}60` : "none",
            }}>
              <div style={{
                fontSize: 28, fontWeight: 900,
                color: i === activeFrame ? f.color : "#475569",
                transition: "color 0.3s",
              }}>{f.ch}</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{f.nm}nm</div>
            </div>
          ))}
        </div>

        {/* Active frame detail */}
        <div style={{
          border: `1px solid ${frame.color}40`,
          borderRadius: 12,
          padding: 24,
          background: `${frame.color}08`,
          boxShadow: `0 0 40px ${frame.color}20`,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>SYMBOL</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: frame.color }}>'{frame.ch}'</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>WAVELENGTH</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: frame.color }}>{frame.nm} nm</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>Ψ CHANNEL</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: frame.color }}>
                Ψ({Math.round((frame.nm - 380) / 16)},{(frame.nm % 7)},{frame.nm % 2 === 0 ? "H" : "V"})
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, fontSize: 11 }}>
            {[
              { label: "sync", val: "0xAA" },
              { label: "frequency_hz", val: `${(frame.freq / 1e12).toFixed(2)} THz` },
              { label: "energy_joules", val: `${frame.energy.toExponential(2)} J` },
              { label: "lambda_mass_kg", val: `${(frame.energy / (3e8**2)).toExponential(2)} kg` },
              { label: "checksum", val: `${(frame.ch.charCodeAt(0) ^ Math.round(frame.nm)) % 256}` },
              { label: "payload_bit", val: `${frame.idx % 2}` },
              { label: "wascii_defined", val: "true ✓" },
              { label: "PSQ", val: `PSQ-${frame.ch.charCodeAt(0).toString(16).padStart(3,"0")}${frame.nm.toString(16)}-TTL10` },
            ].map(({ label, val }) => (
              <div key={label} style={{
                background: "rgba(0,0,0,0.3)",
                borderRadius: 6, padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ color: "#475569", marginBottom: 2 }}>{label}</div>
                <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Colour swatch */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 8,
              background: frame.color,
              boxShadow: `0 0 24px ${frame.color}`,
              flexShrink: 0,
            }} />
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Physical photon colour at {frame.nm}nm — this is the actual colour light appears at this wavelength.
              <br />WASCII maps every character to a real point in the electromagnetic spectrum.
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SCENE 2 — LAYER STACK L0 → L5
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 900, margin: "0 auto 64px", padding: "0 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#3b82f6", letterSpacing: 3, marginBottom: 6 }}>SCENE 02</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Architecture Layer Stack</h2>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            Six layers from physical alphabet substrate to P2P network discovery. Energy flows upward.
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Stack */}
          <div style={{ flex: 1, minWidth: 280 }}>
            {[...LAYERS].reverse().map((layer, ri) => {
              const i = LAYERS.length - 1 - ri;
              const isActive = i === activeLayer;
              return (
                <div key={layer.id} className="layer-bar" style={{
                  border: `1px solid ${isActive ? layer.color : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 8, padding: "12px 16px", marginBottom: 8,
                  background: isActive ? layer.bg : "rgba(255,255,255,0.01)",
                  boxShadow: isActive ? `0 0 24px ${layer.color}40, inset 0 0 20px ${layer.color}10` : "none",
                  cursor: "default",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: isActive ? layer.color : "rgba(255,255,255,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                      color: isActive ? "#000" : "#475569",
                      transition: "all 0.4s",
                      boxShadow: isActive ? `0 0 12px ${layer.color}` : "none",
                    }}>{layer.id}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? layer.color : "#94a3b8" }}>
                        {layer.label}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{layer.sub}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Energy flow visualiser */}
          <div style={{
            width: 64, flexShrink: 0, position: "relative",
            height: LAYERS.length * 60, alignSelf: "center",
          }}>
            <svg width="64" height={LAYERS.length * 60} style={{ position: "absolute", top: 0, left: 0 }}>
              {LAYERS.map((layer, i) => {
                const y = (LAYERS.length - 1 - i) * 60 + 30;
                const nextY = (LAYERS.length - i) * 60 - 30;
                const isActive = i === activeLayer;
                return (
                  <g key={layer.id}>
                    <circle cx="32" cy={y} r={isActive ? 10 : 6}
                      fill={layer.color}
                      opacity={isActive ? 1 : 0.3}
                      style={{ transition: "all 0.4s" }}
                    />
                    {i < LAYERS.length - 1 && (
                      <line x1="32" y1={y} x2="32" y2={nextY}
                        stroke={layer.color} strokeWidth={2} opacity={0.2}
                        strokeDasharray="4 4"
                      />
                    )}
                    {/* Particle rising */}
                    {i <= activeLayer && (
                      <circle cx="32"
                        cy={y - ((particlePhase / 100) * 60) % 60}
                        r="3"
                        fill={layer.color}
                        opacity={0.7}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Active layer detail */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{
              border: `1px solid ${LAYERS[activeLayer].color}40`,
              borderRadius: 12, padding: 20,
              background: `${LAYERS[activeLayer].color}08`,
              boxShadow: `0 0 32px ${LAYERS[activeLayer].color}20`,
            }}>
              <div style={{ fontSize: 11, color: LAYERS[activeLayer].color, marginBottom: 8, letterSpacing: 2 }}>
                ACTIVE LAYER
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: LAYERS[activeLayer].color, marginBottom: 4 }}>
                {LAYERS[activeLayer].id}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{LAYERS[activeLayer].label}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{LAYERS[activeLayer].sub}</div>

              {/* Mini spec for this layer */}
              <div style={{ marginTop: 16, padding: 12, background: "rgba(0,0,0,0.3)", borderRadius: 8, fontSize: 11 }}>
                {activeLayer === 0 && <>
                  <div style={{ color: "#9333ea", marginBottom: 4 }}>Genesis proof on-chain:</div>
                  <div style={{ color: "#64748b" }}>Block #4 · 25MB "angry birds"</div>
                  <div style={{ color: "#64748b" }}>Ψ(211,35,H) · 534.51nm</div>
                  <div style={{ color: "#64748b" }}>SHA: 165d7f9 · Nov 2025</div>
                </>}
                {activeLayer === 1 && <>
                  <div style={{ color: "#3b82f6", marginBottom: 4 }}>Hilbert Space channels:</div>
                  <div style={{ color: "#64748b" }}>51,200 orthogonal Ψ channels</div>
                  <div style={{ color: "#64748b" }}>λ × OAM × polarization</div>
                  <div style={{ color: "#64748b" }}>620+ spectral records live</div>
                </>}
                {activeLayer === 2 && <>
                  <div style={{ color: "#06b6d4", marginBottom: 4 }}>Photonic blockchain:</div>
                  <div style={{ color: "#64748b" }}>5 blocks confirmed</div>
                  <div style={{ color: "#64748b" }}>479 spectral records</div>
                  <div style={{ color: "#64748b" }}>478 transactions</div>
                </>}
                {activeLayer === 3 && <>
                  <div style={{ color: "#10b981", marginBottom: 4 }}>Kernel agents online:</div>
                  <div style={{ color: "#64748b" }}>6 agents · Watchdog active</div>
                  <div style={{ color: "#64748b" }}>KernelEventBus · SSE stream</div>
                  <div style={{ color: "#64748b" }}>8 interrupt types</div>
                </>}
                {activeLayer === 4 && <>
                  <div style={{ color: "#f59e0b", marginBottom: 4 }}>NXT Token economy:</div>
                  <div style={{ color: "#64748b" }}>21B supply · 8 decimals</div>
                  <div style={{ color: "#64748b" }}>Orbital Treasury: 5 buckets</div>
                  <div style={{ color: "#64748b" }}>E=hf transaction cost</div>
                </>}
                {activeLayer === 5 && <>
                  <div style={{ color: "#f97316", marginBottom: 4 }}>Spectral P2P network:</div>
                  <div style={{ color: "#64748b" }}>Node name → avg ASCII → λ</div>
                  <div style={{ color: "#64748b" }}>No DNS · No IP registry</div>
                  <div style={{ color: "#64748b" }}>Physics IS the address</div>
                </>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SCENE 3 — SYSTEM TOPOLOGY
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 900, margin: "0 auto 64px", padding: "0 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#06b6d4", letterSpacing: 3, marginBottom: 6 }}>SCENE 03</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Live Ecosystem Topology</h2>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            All systems connected and communicating through Ψ channels. The centre is the WNSP protocol kernel.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <svg width="400" height="400" viewBox="0 0 400 400" style={{ maxWidth: "100%", overflow: "visible" }}>
            {/* Orbital ring */}
            <circle cx="200" cy="200" r="160"
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none"
              strokeDasharray="4 6"
            />
            <circle cx="200" cy="200" r="80"
              stroke="rgba(147,51,234,0.15)" strokeWidth="1" fill="none"
            />

            {/* Beams from centre to each node */}
            {NODES.map((node, i) => {
              const pos = toXY(node.angle, node.r);
              const isActive = i === glowIdx;
              return (
                <line key={node.id}
                  x1="200" y1="200" x2={pos.x} y2={pos.y}
                  stroke={node.color}
                  strokeWidth={isActive ? 2 : 0.5}
                  opacity={isActive ? 0.8 : 0.15}
                  style={{ transition: "all 0.4s" }}
                />
              );
            })}

            {/* Travelling particle along active beam */}
            {(() => {
              const node = NODES[glowIdx];
              const pos = toXY(node.angle, node.r);
              const t = (particlePhase % 100) / 100;
              const px = 200 + (pos.x - 200) * t;
              const py = 200 + (pos.y - 200) * t;
              return (
                <circle cx={px} cy={py} r="4"
                  fill={node.color}
                  style={{ filter: `drop-shadow(0 0 6px ${node.color})` }}
                />
              );
            })()}

            {/* Outer nodes */}
            {NODES.map((node, i) => {
              const pos = toXY(node.angle, node.r);
              const isActive = i === glowIdx;
              return (
                <g key={node.id} style={{ cursor: "default" }}>
                  <circle cx={pos.x} cy={pos.y} r={isActive ? 22 : 16}
                    fill={isActive ? `${node.color}30` : "rgba(0,0,8,0.8)"}
                    stroke={node.color}
                    strokeWidth={isActive ? 2 : 1}
                    opacity={isActive ? 1 : 0.5}
                    style={{ transition: "all 0.4s", filter: isActive ? `drop-shadow(0 0 12px ${node.color})` : "none" }}
                  />
                  <text x={pos.x} y={pos.y - 2} textAnchor="middle"
                    fill={node.color} fontSize="8" fontWeight="700">
                    {node.label.split(" ")[0]}
                  </text>
                  <text x={pos.x} y={pos.y + 8} textAnchor="middle"
                    fill="#475569" fontSize="7">
                    {node.sub}
                  </text>
                </g>
              );
            })}

            {/* Central kernel */}
            <circle cx="200" cy="200" r="36"
              fill="rgba(147,51,234,0.15)"
              stroke="#9333ea"
              strokeWidth="1.5"
              style={{ filter: "drop-shadow(0 0 16px rgba(147,51,234,0.6))" }}
            />
            <circle cx="200" cy="200" r="22"
              fill="rgba(147,51,234,0.25)"
              stroke="#c084fc"
              strokeWidth="1"
            />
            <text x="200" y="196" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="700">WNSP</text>
            <text x="200" y="207" textAnchor="middle" fill="#9333ea" fontSize="7">KERNEL</text>

            {/* Rotating halo */}
            <circle cx="200" cy="200" r="50"
              stroke="rgba(147,51,234,0.2)" strokeWidth="1" fill="none"
              strokeDasharray="4 8"
              style={{ transformOrigin: "200px 200px", animation: "spin-slow 8s linear infinite" }}
            />
          </svg>
        </div>

        {/* Active node info strip */}
        <div style={{
          border: `1px solid ${NODES[glowIdx].color}40`,
          borderRadius: 10, padding: "12px 20px", marginTop: 8,
          background: `${NODES[glowIdx].color}08`,
          display: "flex", alignItems: "center", gap: 16,
          transition: "all 0.4s",
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: NODES[glowIdx].color,
            boxShadow: `0 0 12px ${NODES[glowIdx].color}`,
            flexShrink: 0,
          }} />
          <div>
            <span style={{ color: NODES[glowIdx].color, fontWeight: 700 }}>{NODES[glowIdx].label}</span>
            <span style={{ color: "#64748b", fontSize: 12, marginLeft: 12 }}>{NODES[glowIdx].sub}</span>
          </div>
          <div style={{ marginLeft: "auto", color: "#475569", fontSize: 11 }}>
            transmitting on Ψ({NODES[glowIdx].angle},{glowIdx + 1},{glowIdx % 2 === 0 ? "H" : "V"})
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SCENE 4 — PHYSICS WAVEFORMS
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 900, margin: "0 auto 64px", padding: "0 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#10b981", letterSpacing: 3, marginBottom: 6 }}>SCENE 04</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dual-Spectrum Energy Waveforms</h2>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            Planetary resonance at 7.83 Hz and vacuum first-oscillation at 555 THz — unified through Λ=hf/c².
          </div>
        </div>

        <div style={{
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12, padding: 24, background: "rgba(0,0,0,0.3)",
        }}>
          <div style={{ marginBottom: 20 }}>
            <WaveCanvas freq={1.2} amplitude={22} color="#f59e0b" label="f_r = 7.83 Hz · Schumann Resonance · Planetary" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <WaveCanvas freq={6} amplitude={18} color="#06b6d4" label="f₀ = 555 THz · First Oscillation · Vacuum" />
          </div>
          <div>
            <WaveCanvas freq={3.5} amplitude={28} color="#9333ea" label="Λ superposition · hf/c² unified field" />
          </div>

          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, fontSize: 11 }}>
            {[
              { label: "Schumann resonance", val: "7.83 Hz", color: "#f59e0b", desc: "Earth's EM cavity" },
              { label: "First oscillation", val: "555 THz", color: "#06b6d4", desc: "Cold vacuum energy" },
              { label: "Lambda mass", val: "Λ=hf/c²", color: "#9333ea", desc: "Massless tech bridge" },
            ].map(item => (
              <div key={item.label} style={{
                border: `1px solid ${item.color}30`,
                borderRadius: 8, padding: 12,
                background: `${item.color}08`,
              }}>
                <div style={{ color: item.color, fontWeight: 700, marginBottom: 4 }}>{item.val}</div>
                <div style={{ color: "#94a3b8", marginBottom: 2 }}>{item.label}</div>
                <div style={{ color: "#475569" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SCENE 5 — GENESIS TIMELINE
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 900, margin: "0 auto 64px", padding: "0 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 3, marginBottom: 6 }}>SCENE 05</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Project Timeline</h2>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            377 commits of open, dated, independent development. Every milestone on-chain.
          </div>
        </div>

        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div style={{
            position: "absolute", left: 20, top: 0, bottom: 0,
            width: 2,
            background: "linear-gradient(to bottom, #9333ea, #3b82f6, #06b6d4, #10b981, #f59e0b, #f97316)",
            borderRadius: 2,
          }} />

          {[
            { date: "Nov 2025", label: "Genesis Block", desc: "SHA 165d7f9 · Alphabet-in-spectrum theory committed. WASCII v1.0 derived.", color: "#9333ea" },
            { date: "Dec 2025", label: "Blockchain Live", desc: "Photonic blockchain deployed. Block #4 stores 25MB at Ψ(211,35,H) 534.51nm.", color: "#3b82f6" },
            { date: "Jan 2026", label: "Kernel Agents", desc: "6 WNSP agents boot on Ψ channels. KernelEventBus with SSE streaming active.", color: "#06b6d4" },
            { date: "Feb 2026", label: "WavelengthScript", desc: "Full programming language spec. CE→SE type system. Live transpiler from Python/JS/Rust.", color: "#10b981" },
            { date: "Mar 2026", label: "Spectral Network L5", desc: "P2P node discovery without DNS. Node name → λ → Ψ channel. Physics IS the address.", color: "#f59e0b" },
            { date: "Apr 2026", label: "Live API SDK + GitHub", desc: "7 public endpoints. Full Python/JS/curl SDK docs. Live URL pushed to all GitHub repos.", color: "#f97316" },
          ].map((item, i) => (
            <div key={i} style={{
              marginLeft: 44, marginBottom: 24, position: "relative",
            }}>
              {/* Dot */}
              <div style={{
                position: "absolute", left: -32, top: 4,
                width: 14, height: 14, borderRadius: "50%",
                background: item.color,
                boxShadow: `0 0 10px ${item.color}`,
                border: "2px solid #000008",
              }} />
              <div style={{
                border: `1px solid ${item.color}25`,
                borderRadius: 8, padding: "12px 16px",
                background: `${item.color}06`,
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: item.color, fontWeight: 700, fontSize: 13 }}>{item.label}</span>
                  <span style={{ color: "#475569", fontSize: 11 }}>{item.date}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "32px 24px",
        textAlign: "center",
        color: "#475569",
        fontSize: 12,
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8,
          background: "linear-gradient(135deg,#9333ea,#3b82f6,#06b6d4)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          NexusOS · Kardashev Type I Infrastructure
        </div>
        <div style={{ marginBottom: 8 }}>
          377 commits · AGPL-3.0 · The infrastructure of civilisation cannot be owned.
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          <Link href="/nexus-command"><span style={{ color: "#3b82f6", cursor: "pointer" }}>Nexus Command</span></Link>
          <Link href="/developer-matrix"><span style={{ color: "#3b82f6", cursor: "pointer" }}>Developer SDK</span></Link>
          <Link href="/evidence"><span style={{ color: "#3b82f6", cursor: "pointer" }}>Evidence Ledger</span></Link>
          <Link href="/ecosystem"><span style={{ color: "#3b82f6", cursor: "pointer" }}>Ecosystem</span></Link>
          <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank" rel="noreferrer"
            style={{ color: "#3b82f6" }}>GitHub</a>
        </div>
      </footer>
    </div>
  );
}
