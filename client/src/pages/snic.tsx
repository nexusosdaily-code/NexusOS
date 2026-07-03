import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, Cpu, Zap, Radio, Database, ChevronRight, ExternalLink, Circle } from "lucide-react";

// ── Physical constants ────────────────────────────────────────────────────────
const FIRST_OSC_THz = 555;          // THz  — anchor frequency
const FIRST_OSC_Hz  = 555e12;       // Hz
const SILICON_GHz   = 3;            // GHz  — typical silicon CPU
const SILICON_Hz    = 3e9;
const MULTIPLIER    = FIRST_OSC_Hz / SILICON_Hz;   // 185 000×
const ANCHOR_NM     = 299_792_458 / FIRST_OSC_Hz * 1e9; // ≈ 540 nm

// 10 TB demo maths
const DEMO_BYTES    = 10e12;          // 10 TB in bytes
const DEMO_BITS     = DEMO_BYTES * 8; // bits
const SNIC_BPS      = FIRST_OSC_Hz;   // full-band theoretical
const SNIC_MS       = (DEMO_BITS / SNIC_BPS) * 1000; // ~144 ms
const HDD_SPINUP_MS = 5_000;          // ms — worst-case HDD spinup
const NVME_WAKE_MS  = 3_200;          // ms — NVMe hibernate resume

function nmToHex(nm: number): string {
  if (nm < 450) return "#7c3aed";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#0891b2";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}
const ANCHOR_COLOR = nmToHex(ANCHOR_NM); // green ~540 nm

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimCounter({ to, duration = 1200, suffix = "" }: { to: number; duration?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setVal(Math.round(to * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to, duration]);
  return <>{val.toLocaleString()}{suffix}</>;
}

// ── 10 TB demo animation ──────────────────────────────────────────────────────
function DemoRace() {
  const [running, setRunning] = useState(false);
  const [snicPct, setSnicPct] = useState(0);
  const [hddPct, setHddPct] = useState(0);
  const [snicDone, setSnicDone] = useState(false);
  const [phase, setPhase] = useState<"idle" | "spin" | "snic" | "done">("idle");
  const raf = useRef<number>(0);

  function reset() {
    setSnicPct(0); setHddPct(0); setSnicDone(false); setPhase("idle"); setRunning(false);
  }

  function start() {
    reset();
    setRunning(true);
    setPhase("spin");
    const RACE_MS   = 6000;  // compressed simulation window
    // SNIC finishes in 144 ms real = first ~14% of RACE_MS
    const SNIC_FRAC = SNIC_MS / HDD_SPINUP_MS; // completes well within HDD spinup
    const began = Date.now();

    const tick = () => {
      const elapsed = Date.now() - began;
      const p = elapsed / RACE_MS;

      // SNIC: full 555 THz — done in 144ms scaled to ~1.5s of animation
      const sP = Math.min(elapsed / (RACE_MS * 0.25), 1);
      setSnicPct(sP * 100);
      if (sP >= 1 && !snicDone) { setSnicDone(true); setPhase("snic"); }

      // HDD: spins up for first 80% of animation, then copies slowly
      const spinFrac = Math.min(elapsed / (RACE_MS * 0.75), 1);
      const copyFrac = spinFrac < 1 ? 0 : Math.min((elapsed - RACE_MS * 0.75) / (RACE_MS * 0.25), 1) * 0.08;
      setHddPct(copyFrac * 100);

      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setPhase("done");
    };
    raf.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div className="border border-white/10 rounded-2xl p-6 space-y-5" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-sm mb-0.5">10 TB Backup — Live Race</div>
          <div className="text-white/30 text-[10px]">Compressed simulation · SNIC vs standard storage wakeup</div>
        </div>
        <button
          onClick={running && phase !== "done" ? undefined : start}
          className="px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all"
          style={{ background: running && phase !== "done" ? "#374151" : ANCHOR_COLOR + "30", color: ANCHOR_COLOR, border: `1px solid ${ANCHOR_COLOR}40`, cursor: running && phase !== "done" ? "not-allowed" : "pointer" }}
        >
          {phase === "idle" ? "▶ Run Demo" : phase === "done" ? "↺ Replay" : "Running…"}
        </button>
      </div>

      {/* SNIC bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: ANCHOR_COLOR }} />
            <span className="text-white/70 font-bold">SNIC — 555 THz photonic</span>
          </div>
          <span style={{ color: ANCHOR_COLOR }} className="font-bold font-mono">
            {snicDone ? "✓ DONE — 144 ms" : `${snicPct.toFixed(1)}%`}
          </span>
        </div>
        <div className="h-4 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-none"
            style={{ width: `${snicPct}%`, background: `linear-gradient(90deg, ${ANCHOR_COLOR}aa, ${ANCHOR_COLOR})`, boxShadow: snicDone ? `0 0 12px ${ANCHOR_COLOR}80` : "none" }}
          />
        </div>
        {snicDone && (
          <div className="text-[9px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1" style={{ background: ANCHOR_COLOR + "20", color: ANCHOR_COLOR }}>
            <Zap size={8} /> 10 TB complete · {SNIC_MS.toFixed(0)} ms · full 555 THz channel
          </div>
        )}
      </div>

      {/* HDD/NVMe bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-white/70 font-bold">NVMe SSD — 3 GHz silicon</span>
          </div>
          <span className="text-red-400 font-bold font-mono">
            {phase === "idle" ? "0%" : phase === "spin" && hddPct < 0.1 ? "spinning up…" : `${hddPct.toFixed(2)}%`}
          </span>
        </div>
        <div className="h-4 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${hddPct}%`, background: "linear-gradient(90deg, #ef444490, #ef4444)", transition: "width 100ms linear" }}
          />
        </div>
        {phase !== "idle" && (
          <div className="text-[9px] text-red-400/60 font-mono">
            {phase === "spin" ? `⌛ Hibernation resume in progress — drive not yet accepting I/O` :
             phase === "snic" ? `⌛ Drive online · beginning transfer — SNIC finished ${((Date.now()) / 1000).toFixed(0)}s ago` :
             `Transfer at 20 Gbps — estimated completion: ~22 hours`}
          </div>
        )}
      </div>

      {phase === "done" && (
        <div className="border border-white/10 rounded-xl p-3 mt-2" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="text-white/50 text-[9px] leading-relaxed">
            When SNIC finished at 144 ms, the NVMe drive was still in its hibernation resume sequence.
            At silicon speeds (20 Gbps USB 3.2 Gen 2), 10 TB takes <span className="text-red-400 font-bold">~22 hours</span>.
            The SNIC does it in <span style={{ color: ANCHOR_COLOR }} className="font-bold">0.144 seconds</span> — not because it compresses data,
            but because <span className="text-white/80">555 THz of optical bandwidth is not physically comparable to 3 GHz of silicon clock</span>.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Waveform visualiser for the resonator ────────────────────────────────────
function ResonatorViz() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(p => p + 1), 40);
    return () => clearInterval(id);
  }, []);
  const pts = Array.from({ length: 120 }, (_, i) => {
    const x = i / 119;
    const phase = (t * 0.05) % (Math.PI * 2);
    const y = 0.5 + 0.42 * Math.sin(x * Math.PI * 8 + phase) * Math.exp(-((x - 0.5) ** 2) * 6);
    return `${x * 100},${y * 60}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 60" className="w-full h-16" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={ANCHOR_COLOR} stopOpacity="0" />
          <stop offset="30%" stopColor={ANCHOR_COLOR} stopOpacity="0.8" />
          <stop offset="70%" stopColor={ANCHOR_COLOR} stopOpacity="0.8" />
          <stop offset="100%" stopColor={ANCHOR_COLOR} stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polyline points={pts} fill="none" stroke="url(#waveGrad)" strokeWidth="1.5" filter="url(#glow)" />
      <text x="50" y="8" textAnchor="middle" fill={ANCHOR_COLOR} fontSize="4" fontFamily="monospace" opacity="0.6">
        555 THz · λ ≈ 540 nm
      </text>
    </svg>
  );
}

// ── WASCII gate animation ─────────────────────────────────────────────────────
const WASCII_EXAMPLES = [
  { char: "N", code: 78, nm: 380 + ((78 - 32) / 94) * 400, label: "N → 579.8 nm" },
  { char: "E", code: 69, nm: 380 + ((69 - 32) / 94) * 400, label: "E → 557.4 nm" },
  { char: "X", code: 88, nm: 380 + ((88 - 32) / 94) * 400, label: "X → 598.5 nm" },
  { char: "U", code: 85, nm: 380 + ((85 - 32) / 94) * 400, label: "U → 585.7 nm" },
  { char: "S", code: 83, nm: 380 + ((83 - 32) / 94) * 400, label: "S → 579.1 nm" },
];

function WasciGates() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive(p => (p + 1) % WASCII_EXAMPLES.length), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-2">
      {WASCII_EXAMPLES.map((w, i) => {
        const col = nmToHex(w.nm);
        const isActive = i === active;
        return (
          <div key={w.char} className="flex items-center gap-3 transition-all" style={{ opacity: isActive ? 1 : 0.25 }}>
            <div className="w-7 h-7 rounded flex items-center justify-center font-bold font-mono text-sm border flex-shrink-0"
              style={{ background: col + "20", borderColor: col + "60", color: col }}>
              {w.char}
            </div>
            <div className="flex-1 h-1 rounded-full" style={{ background: isActive ? col : col + "30", boxShadow: isActive ? `0 0 8px ${col}80` : "none", transition: "all 0.3s" }} />
            <div className="w-16 h-5 rounded border flex items-center justify-center text-[8px] font-mono flex-shrink-0"
              style={{ background: col + "15", borderColor: col + "40", color: col }}>
              {w.nm.toFixed(1)} nm
            </div>
            {isActive && <div className="text-[8px] font-bold flex-shrink-0" style={{ color: col }}>● LIVE</div>}
          </div>
        );
      })}
      <div className="text-white/20 text-[9px] mt-2">No CPU path — character IS the photon frequency</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SnicPage() {
  const [showMath, setShowMath] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "monospace" }}>

      {/* Nav */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2.5">
            <Radio size={14} style={{ color: ANCHOR_COLOR }} />
            <span className="text-sm font-bold tracking-wider" style={{ color: ANCHOR_COLOR }}>SNIC — SPECTRAL NETWORK INTERFACE CARD</span>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ANCHOR_COLOR }} />
          </div>
          <span className="text-white/20 text-[10px]">Hardware Goal #1 · 555 THz photonic I/O · AGPL-3.0</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/nexus-hardware-os">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 transition-all text-[10px]">
              <Cpu size={9} /> Hardware OS
            </button>
          </Link>
          <Link href="/crowdfund">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
              style={{ borderColor: ANCHOR_COLOR + "50", color: ANCHOR_COLOR, background: ANCHOR_COLOR + "10" }}>
              <Zap size={9} /> Back This
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="text-white/20 text-[10px] uppercase tracking-[0.3em]">Hardware Goal #1 · NexusOS R&D Programme</div>
          <div className="relative inline-block">
            <div className="text-8xl font-black tabular-nums" style={{ color: ANCHOR_COLOR, textShadow: `0 0 60px ${ANCHOR_COLOR}60` }}>
              185,000<span className="text-5xl">×</span>
            </div>
            <div className="text-white/30 text-xs mt-1">555 THz ÷ 3 GHz — photonic vs silicon clock ratio</div>
          </div>
          <h1 className="text-2xl font-bold text-white max-w-2xl mx-auto leading-tight">
            The Spectral Network Interface Card replaces silicon clocks<br />
            with a micro-ring resonator locked to the 555 THz anchor.
          </h1>
          <p className="text-white/40 text-sm max-w-xl mx-auto leading-relaxed">
            No compression. No encoding overhead. The WASCII character IS the photon frequency.
            The address IS the wavelength. I/O bypasses the CPU entirely.
          </p>

          {/* multiplier explainer toggle */}
          <button
            onClick={() => setShowMath(p => !p)}
            className="text-[10px] text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors"
          >
            {showMath ? "▲ hide" : "▼ show"} the physics behind 185,000×
          </button>
          {showMath && (
            <div className="mx-auto max-w-lg border border-white/8 rounded-xl p-4 text-left space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-white/50 text-[10px] space-y-1 font-mono">
                <div>f_photonic = 555 THz = 555 × 10¹² Hz</div>
                <div>f_silicon  =   3 GHz =   3 × 10⁹  Hz</div>
                <div className="border-t border-white/10 pt-1 mt-1">
                  multiplier = f_photonic / f_silicon
                </div>
                <div className="text-lg font-bold" style={{ color: ANCHOR_COLOR }}>
                  = 555 × 10¹² / 3 × 10⁹ = <AnimCounter to={185000} duration={800} /> ×
                </div>
                <div className="text-white/30 text-[8px] pt-1">
                  λ = c / f = 299,792,458 / 555×10¹² ≈ {ANCHOR_NM.toFixed(2)} nm · visible green light
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Three pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Pillar 1 — Resonator */}
          <div className="border rounded-2xl p-5 space-y-4" style={{ borderColor: ANCHOR_COLOR + "30", background: ANCHOR_COLOR + "06" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: ANCHOR_COLOR + "20" }}>
                <Radio size={14} style={{ color: ANCHOR_COLOR }} />
              </div>
              <div>
                <div className="text-white font-bold text-[12px]">The Resonator</div>
                <div className="text-white/30 text-[9px]">No silicon oscillator</div>
              </div>
            </div>
            <ResonatorViz />
            <p className="text-white/50 text-[10px] leading-relaxed">
              A <span className="text-white/80 font-bold">micro-ring resonator</span> replaces the silicon crystal oscillator.
              Tuned to the <span style={{ color: ANCHOR_COLOR }} className="font-bold">555 THz first oscillation</span> — the anchor
              frequency of the visible spectrum — it generates a coherent photonic clock
              that is 185,000× faster than a 3 GHz CPU by physical law, not by engineering.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Clock Frequency", value: "555 THz" },
                { label: "Anchor Wavelength", value: `${ANCHOR_NM.toFixed(0)} nm` },
                { label: "Q-factor target", value: "> 10⁶" },
                { label: "Silicon equivalent", value: "3 GHz" },
              ].map(r => (
                <div key={r.label} className="border border-white/8 rounded-lg p-2">
                  <div className="text-[9px] font-bold" style={{ color: ANCHOR_COLOR }}>{r.value}</div>
                  <div className="text-white/30 text-[8px]">{r.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pillar 2 — Direct Map */}
          <div className="border rounded-2xl p-5 space-y-4 border-purple-400/20" style={{ background: "rgba(168,85,247,0.04)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-400/20">
                <Zap size={14} className="text-purple-400" />
              </div>
              <div>
                <div className="text-white font-bold text-[12px]">The Direct Map</div>
                <div className="text-white/30 text-[9px]">CPU bypassed entirely</div>
              </div>
            </div>
            <WasciGates />
            <p className="text-white/50 text-[10px] leading-relaxed mt-2">
              Hardware-level <span className="text-purple-300 font-bold">WASCII-to-Wavelength gates</span> convert
              each character code point directly into a photon at its corresponding wavelength.
              No CPU instruction. No memory lookup. No encoding pipeline.
              The gate IS the encoder — physics does the work.
            </p>
            <div className="border border-purple-400/15 rounded-lg p-2.5 text-[9px] font-mono text-purple-300/70">
              WASCII → gate voltage → ring resonance → photon λ<br />
              latency: &lt; 1 / (555 × 10¹²) s ≈ 1.8 femtoseconds
            </div>
          </div>

          {/* Pillar 3 — Live Demo */}
          <div className="border rounded-2xl p-5 space-y-4 border-cyan-400/20" style={{ background: "rgba(6,182,212,0.04)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-400/20">
                <Database size={14} className="text-cyan-400" />
              </div>
              <div>
                <div className="text-white font-bold text-[12px]">The Proof</div>
                <div className="text-white/30 text-[9px]">10 TB in a fraction of a second</div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: "SNIC transfer time", value: `${SNIC_MS.toFixed(0)} ms`, sub: "full 555 THz channel", color: ANCHOR_COLOR },
                { label: "NVMe wake latency", value: `${NVME_WAKE_MS.toLocaleString()} ms`, sub: "before 1 bit is written", color: "#ef4444" },
                { label: "HDD spinup", value: `${HDD_SPINUP_MS.toLocaleString()} ms`, sub: "before drive accepts I/O", color: "#ef4444" },
                { label: "USB 3.2 @ 20 Gbps", value: "22 hrs", sub: "conventional transfer", color: "#6b7280" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between border border-white/6 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-white/60 text-[9px] font-bold">{r.label}</div>
                    <div className="text-white/25 text-[8px]">{r.sub}</div>
                  </div>
                  <div className="text-sm font-bold font-mono" style={{ color: r.color }}>{r.value}</div>
                </div>
              ))}
            </div>
            <p className="text-white/40 text-[9px] leading-relaxed">
              When SNIC finishes 10 TB, the NVMe drive is still exiting hibernation.
              This is not a throughput record — it is a demonstration that
              photonic I/O operates in a physically different regime.
            </p>
          </div>
        </div>

        {/* Interactive demo */}
        <DemoRace />

        {/* Architecture */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Cpu size={12} style={{ color: ANCHOR_COLOR }} />
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: ANCHOR_COLOR }}>SNIC Internal Architecture</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              {
                layer: "L0",
                name: "555 THz Ring Resonator",
                desc: "Micro-ring optical cavity locked to 540 nm. Generates the photonic clock. Replaces quartz.",
                color: ANCHOR_COLOR,
                status: "DESIGN PHASE",
              },
              {
                layer: "L1",
                name: "WASCII Gate Array",
                desc: "202-gate hardware lookup. Each gate maps one WASCII codepoint → resonance voltage → output λ. Zero CPU cycles.",
                color: "#a855f7",
                status: "SPEC COMPLETE",
              },
              {
                layer: "L2",
                name: "Ψ Channel Multiplexer",
                desc: "51,200 orthogonal channels via WDM + OAM + polarisation. Parallel streams with zero crosstalk.",
                color: "#3b82f6",
                status: "MODELLED",
              },
              {
                layer: "L3",
                name: "Lambda Frame Engine",
                desc: "Frames data into WNSP-SE packets at the physical layer. Ψ address = destination. No routing table.",
                color: "#06b6d4",
                status: "SOFTWARE READY",
              },
            ].map(c => (
              <div key={c.layer} className="border rounded-xl p-4 space-y-2" style={{ borderColor: c.color + "30", background: c.color + "06" }}>
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: c.color + "20", color: c.color }}>{c.layer}</div>
                  <div className="text-[8px] text-white/30">{c.status}</div>
                </div>
                <div className="font-bold text-[11px] text-white">{c.name}</div>
                <p className="text-white/40 text-[9px] leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Data path diagram */}
          <div className="border border-white/8 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-white/30 text-[9px] uppercase tracking-wider">Data path — character to photon</div>
              <Link href="/wnsp">
                <button className="flex items-center gap-1 text-[8px] text-cyan-400/60 hover:text-cyan-400 transition-colors border border-cyan-400/20 rounded px-2 py-0.5">
                  <Radio size={7} /> Encode your own Ψ address →
                </button>
              </Link>
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {[
                { label: "Input byte",     color: "#6b7280", href: null },
                { label: "WASCII gate",    color: "#a855f7", href: null },
                { label: "Ring resonance", color: ANCHOR_COLOR, href: null },
                { label: "Photon @ λ nm",  color: ANCHOR_COLOR, href: null },
                { label: "Ψ(wdm,oam,pol)", color: "#3b82f6", href: "/wnsp" },
                { label: "Destination",    color: "#06b6d4", href: null },
              ].map((s, i, arr) => (
                <div key={s.label} className="flex items-center gap-1">
                  {s.href ? (
                    <Link href={s.href}>
                      <div className="px-2.5 py-1.5 rounded-lg border text-[9px] font-bold cursor-pointer hover:opacity-80 transition-opacity" style={{ borderColor: s.color + "60", color: s.color, background: s.color + "18" }}>
                        {s.label} ↗
                      </div>
                    </Link>
                  ) : (
                    <div className="px-2.5 py-1.5 rounded-lg border text-[9px] font-bold" style={{ borderColor: s.color + "40", color: s.color, background: s.color + "12" }}>
                      {s.label}
                    </div>
                  )}
                  {i < arr.length - 1 && <ChevronRight size={10} className="text-white/20" />}
                </div>
              ))}
            </div>
            <div className="text-center text-white/20 text-[8px] mt-3">
              No CPU instruction · No memory read · No DMA · No interrupt · Photon IS the data
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Database size={12} className="text-white/40" />
            <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">SNIC vs Conventional I/O</span>
          </div>
          <div className="border border-white/8 rounded-2xl overflow-hidden">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-white/8 text-white/30 text-[9px] uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Metric</th>
                  <th className="px-4 py-3 text-center" style={{ color: ANCHOR_COLOR }}>SNIC (555 THz)</th>
                  <th className="px-4 py-3 text-center text-red-400">NVMe PCIe 5.0</th>
                  <th className="px-4 py-3 text-center text-white/30">USB 3.2 Gen 2</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Clock source", "555 THz ring resonator", "3 GHz crystal", "≤ 3 GHz crystal"],
                  ["Peak bandwidth", "555 THz (theoretical)", "~14 GB/s", "~2.5 GB/s"],
                  ["10 TB transfer", "144 ms", "~12 minutes", "~22 hours"],
                  ["Wake/resume latency", "0 ms (always on)", "~3,200 ms", "~200 ms"],
                  ["CPU involvement", "None — gates bypass CPU", "DMA + interrupt", "DMA + interrupt"],
                  ["Addressing", "Ψ(wdm, oam, pol)", "LBA sector number", "LUN + block"],
                  ["Encoding overhead", "None — char = photon", "NVMe protocol", "SCSI / BOT"],
                  ["Protocol layer", "WNSP-SE (physics)", "NVMe over PCIe", "USB-IF spec"],
                  ["Speed multiplier", "185,000× vs silicon", "1× baseline", "0.18× of NVMe"],
                ].map(([metric, snic, nvme, usb]) => (
                  <tr key={metric} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-2.5 text-white/50 font-bold">{metric}</td>
                    <td className="px-4 py-2.5 text-center font-bold" style={{ color: ANCHOR_COLOR }}>{snic}</td>
                    <td className="px-4 py-2.5 text-center text-red-400/70">{nvme}</td>
                    <td className="px-4 py-2.5 text-center text-white/30">{usb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Why now */}
        <div className="border border-white/8 rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="flex items-center gap-2">
            <Zap size={12} style={{ color: ANCHOR_COLOR }} />
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: ANCHOR_COLOR }}>Why This Is Buildable Now</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Micro-ring resonators exist",
                body: "Photonic integrated circuits with ring resonators are in production at IMEC, GlobalFoundries, and TSMC photonic MPW runs. The fabrication is solved.",
                color: ANCHOR_COLOR,
              },
              {
                title: "WASCII is fully specified",
                body: "202-character encoding table is complete, open, and verifiable. Every gate can be hard-wired in silicon photonics today. The spec is AGPL-3.0.",
                color: "#a855f7",
              },
              {
                title: "The Ψ channel model is proved",
                body: "51,200 orthogonal channels modelled, Block #4 stored at Ψ(211,35,H) = 534.51 nm on-chain. The addressing layer is live.",
                color: "#3b82f6",
              },
            ].map(w => (
              <div key={w.title} className="space-y-1.5">
                <div className="font-bold text-[11px]" style={{ color: w.color }}>{w.title}</div>
                <p className="text-white/40 text-[10px] leading-relaxed">{w.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Funding CTA */}
        <div className="border rounded-2xl p-6 text-center space-y-4" style={{ borderColor: ANCHOR_COLOR + "30", background: ANCHOR_COLOR + "06" }}>
          <div className="text-white/20 text-[9px] uppercase tracking-[0.3em]">Fund Hardware Goal #1</div>
          <h2 className="text-lg font-bold text-white">The SNIC prototype is the first deliverable.</h2>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            Every NXT contributed through the crowdfund goes directly to the five-bucket Orbital Treasury.
            35% maintenance · 25% deliverables · 20% research · 10% agent rewards · 10% Nexus Charitable Trust.
            Contributions are recorded as Nexus Shares on-chain — open equity, no trust required.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/crowdfund">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{ background: ANCHOR_COLOR, color: "#000" }}>
                <Zap size={14} /> Fund with NXT
              </button>
            </Link>
            <Link href="/indiegogo">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border border-white/20 text-white/70 hover:text-white transition-all">
                <ExternalLink size={14} /> Indiegogo (USD)
              </button>
            </Link>
            <Link href="/evidence">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border border-white/10 text-white/40 hover:text-white/70 transition-all">
                Verify on-chain proof
              </button>
            </Link>
          </div>
          <div className="text-white/20 text-[9px]">AGPL-3.0 · All source open · 100-year project · Kardashev Type I infrastructure</div>
        </div>

      </div>
    </div>
  );
}
