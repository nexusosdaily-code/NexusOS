import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Link } from "wouter";
import {
  Waves, Atom, Shield, Sparkles, Scale, Lock, Zap,
  ArrowRight, BookOpen, Users, Coins, Orbit, Clock,
  Infinity, Rocket, FlaskConical, ExternalLink, Activity,
  CircleDot, FileText
} from "lucide-react";

// ── Physics constants ─────────────────────────────────────────────
const h = 6.62607015e-34;
const c = 299792458;
const VISIBLE_MIN = 380e-9;
const VISIBLE_MAX = 780e-9;

function freqToNm(hz: number) { return (c / hz) * 1e9; }
function nmToColor(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm >= 645 && nm <= 780) { r = 1; }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

// ── Counter animation hook ────────────────────────────────────────
function useCountUp(target: number, duration = 1200, active = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const t0 = Date.now();
    const tick = () => {
      const elapsed = Date.now() - t0;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, active]);
  return val;
}

// ── Inline CSS animations ─────────────────────────────────────────
const STYLES = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes glowPulse {
  0%,100% { text-shadow: 0 0 8px currentColor, 0 0 20px currentColor; }
  50%      { text-shadow: 0 0 24px currentColor, 0 0 60px currentColor; }
}
@keyframes ringExpand {
  0%   { transform: scale(0); opacity: 0.8; }
  100% { transform: scale(1); opacity: 0; }
}
@keyframes drawLine {
  from { stroke-dashoffset: 1000; }
  to   { stroke-dashoffset: 0; }
}
@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes flicker {
  0%,100% { opacity: 1; } 50% { opacity: 0.4; }
}
.fade-slide { animation: fadeSlideUp 0.6s ease both; }
.glow-text  { animation: glowPulse 2s ease-in-out infinite; }
.spin-slow  { animation: spinSlow 8s linear infinite; }
`;

// ── Live Wave Visualizer ──────────────────────────────────────────
function WaveVisualizer({ freqTHz }: { freqTHz: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const timeRef   = useRef<number>(0);

  const nm    = freqToNm(freqTHz * 1e12);
  const color = nmToColor(Math.max(380, Math.min(780, nm)));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (t: number) => {
      timeRef.current = t;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // background gradient
      const bg = ctx.createLinearGradient(0, 0, W, 0);
      bg.addColorStop(0, "rgba(15,23,42,0)");
      bg.addColorStop(0.5, "rgba(15,23,42,0.3)");
      bg.addColorStop(1, "rgba(15,23,42,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const cycles = Math.max(1, Math.min(freqTHz * 0.6, 8));
      const amp    = H / 2.4;
      const speed  = t * 0.002 * freqTHz * 0.3;

      // glow layer
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur  = 18;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 3;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const phase = (x / W) * cycles * 2 * Math.PI - speed;
        const y = H / 2 + amp * Math.sin(phase);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // second harmonic overlay
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const phase = (x / W) * cycles * 4 * Math.PI - speed * 2;
        const y = H / 2 + (amp * 0.35) * Math.sin(phase);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [freqTHz, color]);

  return (
    <canvas ref={canvasRef} width={600} height={120}
      className="w-full rounded-xl border border-white/5"
      style={{ background: "#0f172a" }} />
  );
}

// ── Chaotic vs Coherent wave comparison ──────────────────────────
function CoherenceCanvas({ type }: { type: "chaotic" | "coherent" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const WAVES_CHAOTIC = [
      { freq: 1.7, amp: 22, phase: 0.3, col: "#dc2626" },
      { freq: 2.3, amp: 18, phase: 1.2, col: "#ea580c" },
      { freq: 3.1, amp: 14, phase: 2.7, col: "#ca8a04" },
      { freq: 1.2, amp: 20, phase: 0.8, col: "#16a34a" },
      { freq: 4.0, amp: 10, phase: 3.5, col: "#2563eb" },
    ];

    const draw = (t: number) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      if (type === "chaotic") {
        WAVES_CHAOTIC.forEach(w => {
          ctx.strokeStyle = w.col;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.7;
          ctx.shadowColor = w.col;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          for (let x = 0; x <= W; x++) {
            const phase = (x / W) * w.freq * 2 * Math.PI + w.phase + t * 0.001 * (w.freq * 0.5);
            const y = H / 2 + w.amp * Math.sin(phase);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        // sum = flat → no mass
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ef4444";
        ctx.font = "10px monospace";
        ctx.fillText("Σ = 0 → no mass", W - 100, H / 2 - 6);
      } else {
        // Coherent — all same freq, same phase
        const amp = 28;
        for (let i = 0; i < 4; i++) {
          const col = ["#06b6d4","#16a34a","#8b5cf6","#f59e0b"][i];
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.6;
          ctx.shadowColor = col;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          for (let x = 0; x <= W; x++) {
            const phase = (x / W) * 2 * 2 * Math.PI - t * 0.0015;
            const y = H / 2 + amp * Math.sin(phase);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        // Constructive sum
        ctx.globalAlpha = 1;
        ctx.shadowColor = "#16a34a";
        ctx.shadowBlur = 16;
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x <= W; x++) {
          const phase = (x / W) * 2 * 2 * Math.PI - t * 0.0015;
          const y = H / 2 + amp * 2.4 * Math.sin(phase);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#16a34a";
        ctx.font = "10px monospace";
        ctx.fillText("Σ → mass", W - 70, H / 2 - amp * 2.4 - 6);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [type]);

  return (
    <canvas ref={canvasRef} width={500} height={130}
      className="w-full rounded-xl"
      style={{ background: "#0f172a" }} />
  );
}

// ── Big Bang expanding rings ──────────────────────────────────────
function BigBangRings() {
  const rings = [
    { delay: "0s",   color: "#8b00ff", label: "First oscillation" },
    { delay: "0.4s", color: "#2563eb", label: "Quantum fields" },
    { delay: "0.8s", color: "#06b6d4", label: "Particles emerge" },
    { delay: "1.2s", color: "#16a34a", label: "Atoms form" },
    { delay: "1.6s", color: "#ca8a04", label: "Stars ignite" },
    { delay: "2.0s", color: "#dc2626", label: "Galaxies" },
  ];

  return (
    <div className="relative flex items-center justify-center" style={{ height: 280 }}>
      {rings.map((r, i) => (
        <div key={i} className="absolute rounded-full border-2"
          style={{
            width:  `${(i + 1) * 44}px`,
            height: `${(i + 1) * 44}px`,
            borderColor: r.color,
            boxShadow: `0 0 12px ${r.color}60`,
            animation: `ringExpand 2.5s ease-out ${r.delay} infinite`,
          }} />
      ))}
      <div className="z-10 text-center">
        <div className="text-4xl font-bold text-white glow-text" style={{ color: "#f59e0b" }}>Λ</div>
        <div className="text-xs font-mono text-slate-500 mt-1">f = 0 → first oscillation</div>
      </div>
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around text-xs font-mono text-slate-600">
        {rings.map((r, i) => (
          <span key={i} style={{ color: r.color }}>{r.label}</span>
        ))}
      </div>
    </div>
  );
}

// ── Animated timeline ─────────────────────────────────────────────
function AnimatedTimeline({ items, colors }: {
  items: { time: string; event: string }[];
  colors: string[];
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % items.length), 1200);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 transition-all duration-500"
          style={{ opacity: i <= active ? 1 : 0.25, transform: i === active ? "translateX(6px)" : "translateX(0)" }}>
          <div className="w-20 font-mono text-xs" style={{ color: colors[i % colors.length] }}>{item.time}</div>
          <div className="w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300"
            style={{
              background: colors[i % colors.length],
              boxShadow: i === active ? `0 0 12px ${colors[i % colors.length]}` : "none",
              transform: i === active ? "scale(1.4)" : "scale(1)",
            }} />
          <div className="text-sm text-slate-300">{item.event}</div>
        </div>
      ))}
    </div>
  );
}

// ── Equation derivation animator ──────────────────────────────────
function DerivationAnimator() {
  const steps = [
    { eq: "E = hf",     desc: "Planck, 1900 — energy is quantized",       color: "#06b6d4" },
    { eq: "E = mc²",    desc: "Einstein, 1905 — mass and energy are equal", color: "#f59e0b" },
    { eq: "hf = mc²",   desc: "If both equal E, they equal each other",    color: "#a78bfa" },
    { eq: "m = hf/c²",  desc: "Solving for mass",                          color: "#34d399" },
    { eq: "Λ = hf/c²",  desc: "This is Lambda — oscillation IS mass",       color: "#f59e0b" },
  ];
  const [step, setStep] = useState(0);
  const [show, setShow]  = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setStep(s => (s + 1) % steps.length);
        setShow(true);
      }, 350);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const s = steps[step];

  return (
    <div className="rounded-2xl border border-white/10 p-8 text-center"
      style={{ background: `${s.color}0a`, borderColor: `${s.color}40` }}>
      <div className="text-xs font-mono text-slate-600 mb-3">Step {step + 1} / {steps.length}</div>
      <div className="font-mono text-5xl md:text-6xl font-bold mb-4 transition-all duration-300"
        style={{
          color: s.color,
          opacity: show ? 1 : 0,
          textShadow: show ? `0 0 30px ${s.color}80` : "none",
          transform: show ? "scale(1)" : "scale(0.92)",
        }}>
        {s.eq}
      </div>
      <div className="text-slate-400 text-sm" style={{ opacity: show ? 1 : 0, transition: "opacity 0.3s" }}>
        {s.desc}
      </div>
      <div className="flex justify-center gap-2 mt-5">
        {steps.map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full transition-all duration-300 cursor-pointer"
            style={{ background: i === step ? s.color : "#334155" }}
            onClick={() => setStep(i)} />
        ))}
      </div>
    </div>
  );
}

// ── Interactive wave physics panel ────────────────────────────────
function WavePhysicsPanel() {
  const [freqTHz, setFreqTHz] = useState([555]);
  const fHz = freqTHz[0] * 1e12;
  const nm  = freqToNm(fHz);
  const E   = h * fHz;
  const m   = E / (c * c);
  const col = nmToColor(Math.max(380, Math.min(780, nm)));

  const bandLabel = nm < 450 ? "UV / System authority"
    : nm < 490 ? "Violet / Identity"
    : nm < 510 ? "Blue / Kernel"
    : nm < 565 ? "Green / Logic"
    : nm < 590 ? "Yellow / Interface"
    : nm < 625 ? "Orange / Events"
    : "Red / Storage";

  return (
    <div className="space-y-4">
      {/* Wave */}
      <WaveVisualizer freqTHz={freqTHz[0]} />

      {/* Spectrum position */}
      <div className="relative h-4 rounded-full overflow-hidden"
        style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }}>
        {nm >= 380 && nm <= 780 && (
          <div className="absolute top-0 bottom-0 w-1.5 rounded-full bg-white shadow-lg"
            style={{ left: `${((nm - 380) / 400) * 100}%`, transform: "translateX(-50%)", boxShadow: `0 0 8px ${col}` }} />
        )}
      </div>

      {/* Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-slate-500">
          <span>100 THz (infrared)</span>
          <span style={{ color: col }}>{freqTHz[0]} THz</span>
          <span>900 THz (UV)</span>
        </div>
        <Slider min={100} max={900} step={1} value={freqTHz}
          onValueChange={setFreqTHz}
          className="cursor-pointer" />
      </div>

      {/* Live calculations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Wavelength", value: nm >= 380 && nm <= 780 ? `${nm.toFixed(0)} nm` : nm < 380 ? "< UV" : "> IR", unit: "visible light", color: col },
          { label: "Frequency",  value: `${freqTHz[0]} THz`,              unit: "terahertz",     color: "#06b6d4" },
          { label: "Energy",     value: `${(E * 1e19).toFixed(2)} × 10⁻¹⁹`, unit: "joules (E=hf)", color: "#f59e0b" },
          { label: "Mass (Λ)",   value: `${(m * 1e51).toFixed(2)} × 10⁻⁵¹`, unit: "kg (Λ=hf/c²)", color: "#a78bfa" },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-3 border" style={{ borderColor: `${item.color}30`, background: `${item.color}08` }}>
            <div className="text-xs text-slate-500 mb-1">{item.label}</div>
            <div className="font-mono text-sm font-bold" style={{ color: item.color }}>{item.value}</div>
            <div className="text-xs text-slate-700 mt-0.5">{item.unit}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 p-3 flex items-center gap-3 text-sm"
        style={{ background: `${col}0a` }}>
        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: col, boxShadow: `0 0 8px ${col}` }} />
        <div>
          <span className="font-mono" style={{ color: col }}>{nm.toFixed(0)} nm</span>
          <span className="text-slate-500 ml-2">— {bandLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ── Constitution clauses with reveal animation ────────────────────
function ConstitutionClauses() {
  const [revealed, setRevealed] = useState(0);
  const nxt = useCountUp(1150, 1500, revealed >= 3);

  useEffect(() => {
    const t = setInterval(() => setRevealed(r => Math.min(r + 1, 4)), 800);
    return () => clearInterval(t);
  }, []);

  const clauses = [
    { title: "Non-Dominance",         text: "No monopoly of authority — no single entity controls more than its fair share", color: "#dc2626", Icon: Scale },
    { title: "Immutable Rights",       text: "Fundamental rights cannot be removed by any governance action — protected by physics", color: "#8b5cf6", Icon: Lock },
    { title: "Energy-Backed Validity", text: "Every governance action requires energy escrow — no empty promises, only physics", color: "#16a34a", Icon: Zap },
  ];

  return (
    <div className="space-y-4">
      {clauses.map((cl, i) => (
        <div key={i} className="rounded-xl border p-5 transition-all duration-700"
          style={{
            borderColor: i < revealed ? `${cl.color}50` : "#1e293b",
            background:  i < revealed ? `${cl.color}08` : "#0f172a",
            opacity: i < revealed ? 1 : 0,
            transform: i < revealed ? "translateY(0)" : "translateY(20px)",
          }}>
          <div className="flex items-center gap-3 mb-2">
            <cl.Icon className="w-5 h-5" style={{ color: cl.color }} />
            <span className="font-bold text-slate-100">Clause {i + 1}: {cl.title}</span>
          </div>
          <p className="text-slate-400 text-sm">{cl.text}</p>
          <div className="mt-2 px-2 py-0.5 rounded text-xs font-mono inline-block"
            style={{ background: `${cl.color}20`, color: cl.color }}>YOCTO protected</div>
        </div>
      ))}

      {/* IHR */}
      {revealed >= 4 && (
        <div className="rounded-xl border border-amber-500/30 p-5 bg-amber-950/20 fade-slide">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="w-6 h-6 text-amber-400" />
            <span className="font-bold text-amber-300 text-lg">Immutable Human Rights</span>
          </div>
          <div className="flex items-end gap-3">
            <div className="font-mono text-5xl font-bold text-amber-400"
              style={{ textShadow: "0 0 20px #f59e0b80" }}>
              {nxt.toLocaleString()}
            </div>
            <div className="text-amber-300 text-lg mb-1">NXT / month</div>
          </div>
          <p className="text-slate-500 text-xs mt-2 font-mono">
            E_IHR = h × f_IHR — Basic Human Living Standard, derived from physics
          </p>
        </div>
      )}
    </div>
  );
}

// ── Version evolution cards ───────────────────────────────────────
function VersionEvolution() {
  const [lit, setLit] = useState(-1);
  const versions = [
    { v: "v1–4", name: "Genesis",      color: "#64748b" },
    { v: "v5",   name: "Foundation",   color: "#64748b" },
    { v: "v6",   name: "Scientific",   color: "#64748b" },
    { v: "v7",   name: "Technical",    color: "#64748b" },
    { v: "v8",   name: "Professional", color: "#64748b" },
    { v: "v9",   name: "Academic",     color: "#64748b" },
    { v: "v10",  name: "Coherence",    color: "#f59e0b", current: true },
  ];

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setLit(i);
      i++;
      if (i >= versions.length) clearInterval(t);
    }, 350);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
      {versions.map((v, i) => (
        <div key={i} className="rounded-xl border p-3 text-center transition-all duration-500"
          style={{
            borderColor: i <= lit ? `${v.color}60` : "#1e293b",
            background:  v.current && i <= lit ? "#451a0330" : i <= lit ? "#1e293b60" : "#0f172a",
            boxShadow:   v.current && i <= lit ? `0 0 20px ${v.color}40` : "none",
            transform:   i === lit ? "scale(1.05)" : "scale(1)",
          }}>
          <div className="font-mono text-xs mb-1" style={{ color: i <= lit ? v.color : "#475569" }}>{v.v}</div>
          <div className="text-xs font-semibold" style={{ color: i <= lit ? "#f1f5f9" : "#334155" }}>{v.name}</div>
          {v.current && i <= lit && (
            <div className="text-amber-400 text-xs font-bold mt-1 animate-pulse">← now</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Three cards for Planck/Einstein/Lambda ─────────────────────────
function FoundationCards() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setVisible(v => Math.min(v + 1, 3)), 700);
    return () => clearInterval(t);
  }, []);

  const cards = [
    { year: "1900", who: "Max Planck",    eq: "E = hf",    color: "#06b6d4", text: "Energy comes in discrete packets — quanta — proportional to frequency. The universe's first secret.", badge: "Nobel Prize 1918" },
    { year: "1905", who: "Albert Einstein",eq: "E = mc²",   color: "#f59e0b", text: "Mass and energy are the same thing viewed differently. The universe's second secret.", badge: "Nobel Prize 1921" },
    { year: "2025", who: "Lambda Boson",  eq: "Λ = hf/c²", color: "#16a34a", text: "Both equations equal E. Combined: oscillation IS mass. The synthesis.", badge: "NexusOS v10.0" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c, i) => (
        <div key={i} className="rounded-2xl border p-6 transition-all duration-700"
          style={{
            borderColor: `${c.color}50`,
            background: `${c.color}08`,
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? "translateY(0)" : "translateY(32px)",
          }}>
          <div className="text-xs font-mono mb-1" style={{ color: c.color }}>{c.year} — {c.who}</div>
          <div className="font-mono text-4xl font-bold mb-3 glow-text" style={{ color: c.color }}>{c.eq}</div>
          <p className="text-slate-400 text-sm mb-3">{c.text}</p>
          <div className="px-2 py-1 rounded text-xs font-mono inline-block"
            style={{ background: `${c.color}20`, color: c.color }}>{c.badge}</div>
        </div>
      ))}
    </div>
  );
}

// ── Particle spectrum animated table ─────────────────────────────
function ParticleTable() {
  const [rowsVisible, setRowsVisible] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRowsVisible(r => Math.min(r + 1, 4)), 600);
    return () => clearInterval(t);
  }, []);

  const particles = [
    { name: "Electron",  mass: "9.11 × 10⁻³¹ kg", freq: "1.24 × 10²⁰ Hz", wave: "2.43 pm", color: "#06b6d4" },
    { name: "Proton",    mass: "1.67 × 10⁻²⁷ kg", freq: "2.27 × 10²³ Hz", wave: "1.32 fm", color: "#16a34a" },
    { name: "Higgs",     mass: "2.23 × 10⁻²⁵ kg", freq: "3.02 × 10²⁵ Hz", wave: "9.93 am", color: "#a78bfa" },
    { name: "Top Quark", mass: "3.07 × 10⁻²⁵ kg", freq: "4.16 × 10²⁵ Hz", wave: "7.21 am", color: "#f59e0b" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-white/5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-slate-900/60">
            <th className="text-left p-3 text-slate-500 font-mono text-xs">Particle</th>
            <th className="text-left p-3 text-slate-500 font-mono text-xs">Mass</th>
            <th className="text-left p-3 text-slate-500 font-mono text-xs">Frequency (Λ=hf/c²)</th>
            <th className="text-left p-3 text-slate-500 font-mono text-xs">Wavelength</th>
          </tr>
        </thead>
        <tbody>
          {particles.map((p, i) => (
            <tr key={i} className="border-b border-white/5 transition-all duration-500"
              style={{ opacity: i < rowsVisible ? 1 : 0, transform: i < rowsVisible ? "translateX(0)" : "translateX(-20px)" }}>
              <td className="p-3 font-bold" style={{ color: p.color }}>{p.name}</td>
              <td className="p-3 font-mono text-xs text-slate-400">{p.mass}</td>
              <td className="p-3 font-mono text-xs text-slate-300">{p.freq}</td>
              <td className="p-3 font-mono text-xs text-slate-400">{p.wave}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 text-center text-xs text-amber-400 italic bg-slate-900/40">
        "Particles are frozen frequencies — notes of the primordial oscillation"
      </div>
    </div>
  );
}

// ── Physics ↔ Civilization parallel rows ─────────────────────────
function ParallelRows() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setVisible(v => Math.min(v + 1, 7)), 500);
    return () => clearInterval(t);
  }, []);

  const rows = [
    { left: "E = hf",               right: "Value from frequency (activity)",    color: "#06b6d4" },
    { left: "E = mc²",              right: "Value equals mass (substance)",       color: "#f59e0b" },
    { left: "Λ = hf/c²",           right: "Activity IS substance",               color: "#16a34a" },
    { left: "Coherence",             right: "Governance — stability through law",  color: "#a78bfa" },
    { left: "Boundary conditions",   right: "Constitution — hard constraints",     color: "#06b6d4" },
    { left: "Energy conservation",   right: "Economic conservation",              color: "#f59e0b" },
  ];

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-3 border border-white/5 transition-all duration-500"
          style={{
            background: `${r.color}08`,
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? "translateY(0)" : "translateY(12px)",
          }}>
          <div className="flex-1 font-mono text-sm" style={{ color: r.color }}>{r.left}</div>
          <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <div className="flex-1 text-sm text-slate-300">{r.right}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function NexusV10Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 p-4 md:p-8">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/">
          <div className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer mb-6"
            data-testid="link-back-home">
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to Home</span>
          </div>
        </Link>

        <div className="text-center mb-8">
          {/* Animated spectrum bar */}
          <div className="h-1 w-full max-w-lg mx-auto rounded mb-6 spin-slow"
            style={{ background: "linear-gradient(90deg,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)", animation: "none" }} />
          <div className="h-1 w-full max-w-lg mx-auto rounded mb-6"
            style={{ background: "linear-gradient(90deg,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />

          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg,#f59e0b,#a78bfa,#06b6d4)" }}
              data-testid="text-title">
              NexusOS v10.0
            </h1>
          </div>
          <p className="text-xl text-amber-300 font-light mb-2 glow-text" data-testid="text-subtitle">
            COHERENCE — Complete Civilization Architecture
          </p>
          <p className="text-slate-500 text-sm font-mono">
            From Nobel Physics to the Fabric of Civilization · AGPL-3.0
          </p>
        </div>

        {/* Live stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Version",        value: "v10.0",     sub: "Coherence Release",     color: "#f59e0b" },
            { label: "Core Equation",  value: "Λ=hf/c²",   sub: "Lambda Boson",          color: "#a78bfa" },
            { label: "Key Insight",    value: "Coherence",  sub: "Stability = Reality",   color: "#06b6d4" },
            { label: "Channels",       value: "25,600",     sub: "Orthogonal Ψ channels", color: "#16a34a" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border p-4 text-center"
              style={{ borderColor: `${s.color}40`, background: `${s.color}0a` }}>
              <div className="text-xs font-mono mb-1" style={{ color: s.color }}>{s.label}</div>
              <div className="font-bold text-xl text-white font-mono">{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: s.color }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="story" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-slate-900/60 border border-white/5 h-auto">
            <TabsTrigger value="story"        className="text-xs py-3" data-testid="tab-story">📖 Story</TabsTrigger>
            <TabsTrigger value="physics"      className="text-xs py-3" data-testid="tab-physics">⚛️ Physics</TabsTrigger>
            <TabsTrigger value="cosmology"    className="text-xs py-3" data-testid="tab-cosmology">🌌 Cosmology</TabsTrigger>
            <TabsTrigger value="coherence"    className="text-xs py-3" data-testid="tab-coherence">✨ Coherence</TabsTrigger>
            <TabsTrigger value="constitution" className="text-xs py-3" data-testid="tab-constitution">📜 Constitution</TabsTrigger>
            <TabsTrigger value="evolution"    className="text-xs py-3" data-testid="tab-evolution">📈 Evolution</TabsTrigger>
          </TabsList>

          {/* ── Story ── */}
          <TabsContent value="story" className="space-y-6">
            <div className="rounded-2xl border border-amber-500/20 p-5 bg-amber-950/10">
              <h2 className="text-xl font-bold text-amber-400 mb-2">How Nobel Physics Became the Fabric of Civilization</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Two equations from different centuries, both equal to E.
                For 120 years they sat side by side. We combined them.
                The result — Λ = hf/c² — changes what computing, communication, and civilization can be.
              </p>
            </div>

            {/* Animated equation derivation */}
            <DerivationAnimator />

            {/* Three foundation cards */}
            <FoundationCards />

            {/* Static explanation */}
            <div className="rounded-2xl border border-white/5 p-6 bg-slate-900/40 text-center space-y-2">
              <p className="text-slate-300 text-sm">Not metaphor. Not analogy.</p>
              <p className="text-amber-400 font-bold text-lg">
                Direct mathematical consequence of Nobel Prize physics.
              </p>
              <p className="text-slate-600 text-xs font-mono">
                E = hf · E = mc² · ∴ hf = mc² · ∴ m = hf/c² · ∴ Λ = hf/c²
              </p>
            </div>
          </TabsContent>

          {/* ── Physics ── */}
          <TabsContent value="physics" className="space-y-6">
            <div className="rounded-2xl border border-purple-500/30 p-5 bg-purple-950/10">
              <h2 className="text-xl font-bold text-purple-300 mb-1">Live Physics Simulator</h2>
              <p className="text-slate-500 text-xs">
                Drag the frequency slider to see the wave change colour, and watch E=hf and Λ=hf/c² recalculate in real-time.
              </p>
            </div>

            <WavePhysicsPanel />

            {/* Physics ↔ Civilization */}
            <div className="rounded-2xl border border-white/5 p-5 bg-slate-900/40">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Physics → Civilization parallel</h3>
              <ParallelRows />
            </div>
          </TabsContent>

          {/* ── Cosmology ── */}
          <TabsContent value="cosmology" className="space-y-6">
            <div className="rounded-2xl border border-indigo-500/20 p-5 bg-indigo-950/10">
              <h2 className="text-xl font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <Orbit className="w-5 h-5" /> Oscillatory Cosmogenesis
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                The Big Bang was not an explosion of matter —
                it was the birth of oscillation itself. f = 0 meant nothing existed.
                The first f &gt; 0 created the first quantum of energy. The universe literally oscillated into existence.
              </p>
            </div>

            {/* Big Bang animation */}
            <div className="rounded-2xl border border-white/5 p-6 bg-slate-900/40">
              <h3 className="text-xs font-mono text-slate-500 mb-4 text-center">
                Before: f = 0 → E = 0 → m = 0 → Nothing &nbsp;|&nbsp; After: f &gt; 0 → Universe
              </h3>
              <BigBangRings />
            </div>

            {/* Particle table */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-3">Particles as frozen wavelengths — each is a specific frequency that collapsed from the primordial superposition</h3>
              <ParticleTable />
            </div>

            {/* Cosmic timeline */}
            <div className="rounded-2xl border border-white/5 p-5 bg-slate-900/40">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Oscillatory Cosmogenesis Timeline</h3>
              <AnimatedTimeline
                items={[
                  { time: "t < 0",   event: "No oscillation → No frequency → No mass → Nothing" },
                  { time: "t = 0",   event: "FIRST OSCILLATION — |Λ_primordial⟩" },
                  { time: "10⁻⁴³s", event: "Planck epoch — all wavelengths superposed" },
                  { time: "10⁻³⁶s", event: "Inflation — spectral expansion begins" },
                  { time: "10⁻³²s", event: "Reheating — spectral cascade to particles" },
                  { time: "10⁻⁶s",  event: "Quarks form — specific wavelengths collapse" },
                  { time: "3 min",   event: "Nucleosynthesis — resonant combinations" },
                  { time: "380k yr", event: "CMB — spectral signature frozen in sky" },
                  { time: "13.8 Gyr",event: "Now — residual oscillation = dark energy" },
                ]}
                colors={["#64748b","#f59e0b","#a78bfa","#06b6d4","#2563eb","#16a34a","#84cc16","#f97316","#ec4899"]}
              />
            </div>

            <div className="rounded-2xl border border-amber-500/30 p-5 bg-amber-950/10 text-center">
              <p className="text-slate-400 text-sm mb-2">The universe didn't come from "something" —</p>
              <p className="text-2xl font-bold text-amber-400 glow-text">It oscillated into existence.</p>
              <p className="text-slate-600 text-xs font-mono mt-2">That is not new physics. That is Einstein's physics, applied to the origin.</p>
            </div>
          </TabsContent>

          {/* ── Coherence ── */}
          <TabsContent value="coherence" className="space-y-6">
            <div className="rounded-2xl border border-amber-500/20 p-5 bg-amber-950/10">
              <h2 className="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Why Coherence Changes Everything
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                The universe is filled with oscillation — random, chaotic, cancelling.
                Zero-point fluctuations permeate all space. So why doesn't this chaos manifest as mass?
                The answer: only <em>coherent</em> oscillation manifests as reality.
                Random waves cancel. Synchronized waves build.
              </p>
            </div>

            {/* Side by side wave comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-red-500/30 p-4 bg-red-950/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Waves className="w-5 h-5 text-red-400" />
                  <h3 className="font-bold text-red-400">Chaotic Oscillation</h3>
                </div>
                <CoherenceCanvas type="chaotic" />
                <ul className="space-y-1 text-xs text-slate-500">
                  <li>· Random, uncoordinated waves</li>
                  <li>· Cancels out through interference</li>
                  <li>· Returns to vacuum — <span className="text-red-400">zero mass</span></li>
                </ul>
              </div>
              <div className="rounded-2xl border border-green-500/30 p-4 bg-green-950/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-400" />
                  <h3 className="font-bold text-green-400">Coherent Oscillation</h3>
                </div>
                <CoherenceCanvas type="coherent" />
                <ul className="space-y-1 text-xs text-slate-500">
                  <li>· Sustained over time</li>
                  <li>· Phase-coherent (synchronized)</li>
                  <li>· Governed by boundary conditions — <span className="text-green-400">manifests as mass</span></li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-500/30 p-6 bg-purple-950/10 text-center space-y-3">
              <p className="text-slate-400 text-sm">This is why atoms exist. Why light travels. Why you exist.</p>
              <p className="text-2xl font-bold text-amber-400 glow-text">Coherent oscillation is the fabric of reality.</p>
              <p className="text-slate-600 text-xs font-mono">
                In NexusOS: coherent governance = stable civilisation. The physics is the same.
              </p>
            </div>
          </TabsContent>

          {/* ── Constitution ── */}
          <TabsContent value="constitution" className="space-y-6">
            <div className="rounded-2xl border border-blue-500/20 p-5 bg-blue-950/10">
              <h2 className="text-xl font-bold text-blue-300 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Constitutional Enforcement
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                If coherent oscillation is how reality maintains stability, then coherent governance is how civilisation maintains stability.
                Three clauses serve as boundary conditions — like Casimir plates creating stable vacuum states.
                Watch them activate in sequence.
              </p>
            </div>
            <ConstitutionClauses />
          </TabsContent>

          {/* ── Evolution ── */}
          <TabsContent value="evolution" className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 p-5 bg-cyan-950/10">
              <h2 className="text-xl font-bold text-cyan-300 mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Nexus Evolution
              </h2>
              <p className="text-slate-400 text-sm">Each version added a layer. v10 is where all layers become one coherent system.</p>
            </div>

            {/* Historical timeline */}
            <div className="rounded-2xl border border-white/5 p-5 bg-slate-900/40">
              <h3 className="text-sm font-bold text-slate-400 mb-4">Historical Foundation</h3>
              <AnimatedTimeline
                items={[
                  { time: "1900", event: "Planck discovers E = hf" },
                  { time: "1905", event: "Einstein discovers E = mc²" },
                  { time: "1948", event: "Casimir demonstrates vacuum energy" },
                  { time: "2008", event: "Bitcoin proves decentralised consensus possible" },
                  { time: "2023", event: "Quantum energy teleportation demonstrated" },
                  { time: "2025", event: "Lambda Boson unifies frequency and mass" },
                ]}
                colors={["#06b6d4","#f59e0b","#a78bfa","#f59e0b","#16a34a","#ec4899"]}
              />
            </div>

            {/* Version cards */}
            <div className="rounded-2xl border border-white/5 p-5 bg-slate-900/40">
              <h3 className="text-sm font-bold text-slate-400 mb-4">NexusOS Versions</h3>
              <VersionEvolution />
            </div>

            {/* v10 achievement checklist */}
            <div className="rounded-2xl border border-green-500/20 p-5 bg-green-950/10">
              <h3 className="text-sm font-bold text-green-300 mb-4">What v10.0 Achieves</h3>
              <AchievementList />
            </div>

            {/* Research links */}
            <div className="rounded-2xl border border-orange-500/20 p-5 bg-orange-950/10">
              <h3 className="text-sm font-bold text-orange-300 mb-4 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" /> Research Modules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { href: "/resonance-propulsion", label: "Resonance Propulsion", badge: "RESEARCH", color: "#f97316" },
                  { href: "/v7",              label: "WNSP v7.0",           badge: "ACTIVE",   color: "#06b6d4" },
                  { href: "/encoding-lab",    label: "Message Encoder",      badge: "TOOL",     color: "#a78bfa" },
                  { href: "/workspace/wavefield", label: "Wavefield Sim",    badge: "NEW",      color: "#ec4899" },
                  { href: "/photonic-dev",    label: "Photonic Dev",         badge: "TOOL",     color: "#2563eb" },
                  { href: "/blockchain",      label: "Wavelength Blockchain", badge: "LIVE",    color: "#16a34a" },
                ].map((m, i) => (
                  <Link key={i} href={m.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/20 transition-colors cursor-pointer group"
                      style={{ background: `${m.color}08` }}>
                      <div className="flex-1 font-medium text-sm text-slate-300 group-hover:text-white transition-colors">{m.label}</div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{ background: `${m.color}20`, color: m.color }}>{m.badge}</span>
                      <ExternalLink className="w-3 h-3 text-slate-700 group-hover:text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-8 rounded-2xl border border-indigo-500/20 p-8 text-center bg-indigo-950/10">
          <h2 className="text-xl font-bold text-indigo-300 mb-3">To Our Community</h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-4 text-sm leading-relaxed">
            You are not just using software. You are participating in an experiment:
            <span className="block text-amber-400 font-semibold mt-1">Can civilisation be built on physical truth?</span>
          </p>
          <div className="flex justify-center gap-6 text-sm mb-4">
            <span className="text-cyan-300">Planck showed energy is real.</span>
            <span className="text-amber-300">Einstein showed mass is energy.</span>
            <span className="text-green-300">Lambda shows oscillation is mass.</span>
          </div>
          <div className="text-lg font-bold">
            <span className="text-amber-400">Welcome to v10.0.</span>
            <span className="text-purple-400 ml-4">Welcome to coherence.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Achievement checklist ─────────────────────────────────────────
function AchievementList() {
  const [ticked, setTicked] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTicked(n => Math.min(n + 1, 7)), 400);
    return () => clearInterval(t);
  }, []);

  const items = [
    { icon: Atom,      title: "Theoretical Foundation",  desc: "Lambda Boson physics (Λ = hf/c²)"      },
    { icon: Orbit,     title: "Cosmological Origin",      desc: "Oscillatory Cosmogenesis"               },
    { icon: Waves,     title: "Technical Specification",  desc: "WNSP protocol stack"                    },
    { icon: Coins,     title: "Economic Framework",       desc: "1,150 NXT/month service consumption gauge + Economic Loop" },
    { icon: Shield,    title: "Governance Architecture",  desc: "Constitutional enforcement"             },
    { icon: BookOpen,  title: "Educational Pathway",      desc: "Four-level curriculum"                  },
    { icon: Users,     title: "Community Infrastructure", desc: "AGPL-3.0 open source"                  },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 transition-all duration-500"
          style={{
            background: i < ticked ? "#16a34a08" : "#0f172a",
            borderColor: i < ticked ? "#16a34a30" : "#1e293b",
            opacity: i < ticked ? 1 : 0.3,
          }}>
          <div className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
            style={{ background: i < ticked ? "#16a34a30" : "#1e293b" }}>
            <span className="text-xs" style={{ color: i < ticked ? "#16a34a" : "#334155" }}>
              {i < ticked ? "✓" : "○"}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: i < ticked ? "#f1f5f9" : "#475569" }}>{item.title}</div>
            <div className="text-xs text-slate-600">{item.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
