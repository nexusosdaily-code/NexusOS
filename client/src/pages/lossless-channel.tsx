import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { EcosystemNav } from "@/components/ecosystem-nav";
import {
  ArrowLeft, Waves, Zap, Radio, ExternalLink,
  GitMerge, Lock, Database, BookOpen,
} from "lucide-react";

// ── SI exact constants ────────────────────────────────────────────────────────
const H_PLANCK  = 6.62607015e-34;   // J·s   (CODATA 2018, exact)
const H_BAR     = H_PLANCK / (2 * Math.PI);
const EV        = 1.602176634e-19;  // J/eV  (CODATA 2018, exact)
const C_LIGHT   = 299_792_458;      // m/s   (SI exact)
const K_B       = 1.380649e-23;     // J/K   (CODATA 2018, exact)
const F0        = 555e12;           // Hz    — NexusOS first oscillation
const E0        = H_PLANCK * F0;    // J
const E0EV      = E0 / EV;          // eV ≈ 2.295
const AMU_EV    = 931_494_000;      // eV/u

function octaveOf(mass_u: number) {
  return Math.log2((mass_u * AMU_EV) / E0EV);
}

// ── Ghost node n=36 ───────────────────────────────────────────────────────────
const N_GHOST      = 36;
const GHOST_MASS_U = (E0EV * Math.pow(2, N_GHOST)) / AMU_EV;

// ── Flanking elements ─────────────────────────────────────────────────────────
const TM_MASS_U   = 168.934;   // Thulium   Z=69  4f¹³  — only stable Tm isotope (Tm-169)
const YB170_MASS_U = 169.935;  // Ytterbium Z=70  Yb-170 — nearest Yb isotope ABOVE ghost (true nuclear boundary)
const YB168_MASS_U = 167.934;  // Ytterbium Z=70  Yb-168 — lightest Yb isotope; sits BELOW the ghost node
const YB_MASS_U   = 173.045;   // Ytterbium Z=70  IUPAC standard atomic weight (conventional element reference)
const KR_MASS_U   = 83.798;    // Krypton   Z=36  noble gas floor
const TM_N        = octaveOf(TM_MASS_U);
const YB170_N     = octaveOf(YB170_MASS_U);
const YB168_N     = octaveOf(YB168_MASS_U);
const YB_N        = octaveOf(YB_MASS_U);
const KR_N        = octaveOf(KR_MASS_U);

// True nuclear gap: nearest occupied eigenstate on each side
const TRUE_GAP_OCT = (N_GHOST - TM_N) + (YB170_N - N_GHOST); // ≈ 0.0085 octaves

// ── n=35 near-ghost (Kr / Rb bracket) ────────────────────────────────────────
const RB_MASS_U = 85.468;           // Rubidium  Z=37
const N35_MASS  = (E0EV * Math.pow(2, 35)) / AMU_EV;
const KR_GAP_35 = 35 - KR_N;       // how far Kr is below n=35
const RB_N      = octaveOf(RB_MASS_U);
const RB_GAP_35 = RB_N - 35;       // how far Rb is above n=35

// ── Zero-point vacuum energy per channel ─────────────────────────────────────
const ZPE_J     = 0.5 * H_BAR * (2 * Math.PI * F0);   // ℏω/2 at f₀
const ZPE_EV    = ZPE_J / EV;

// ── Shannon capacity (per Hz per channel) ─────────────────────────────────────
// C = B · log₂(1 + S/N).  At ghost node N = ZPE noise floor (T→0).
// We express S/N at F0 with unit signal power: S = E0 = hf₀
const SNR_VACUUM = E0 / ZPE_J;     // hf₀ / (ℏω/2) = 2π/π = 2
const C_PER_HZ   = Math.log2(1 + SNR_VACUUM);

const BASE      = "https://wnsp.io";
const PAGE_DATE = "2026-07-07";

// ── Shared UI primitives ─────────────────────────────────────────────────────
function Section({
  id, title, icon: Icon, color, badge, children,
}: {
  id: string; title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string; badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: color + "22", border: `1px solid ${color}44` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                style={{ color, borderColor: color + "55", background: color + "11" }}>
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Eq({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60
                    px-5 py-3.5 font-mono text-sm text-cyan-300 text-center
                    overflow-x-auto">
      {children}
    </div>
  );
}

function Ref({
  n, authors, year, title, journal, doi, note,
}: {
  n: number; authors: string; year: string; title: string;
  journal: string; doi?: string; note?: string;
}) {
  return (
    <div className="flex gap-3 text-xs font-mono leading-relaxed">
      <span className="text-slate-500 flex-shrink-0 w-6 text-right">[{n}]</span>
      <div className="space-y-0.5">
        <p>
          <span className="text-slate-300">{authors}</span>{" "}
          <span className="text-slate-500">({year}).</span>{" "}
          <span className="text-white italic">"{title}."</span>{" "}
          <span className="text-slate-400">{journal}.</span>
          {note && <span className="text-slate-500"> {note}</span>}
        </p>
        {doi && (
          <a href={doi.startsWith("http") ? doi : `https://doi.org/${doi}`}
             target="_blank" rel="noopener noreferrer"
             className="text-cyan-600 hover:text-cyan-400 transition-colors
                        inline-flex items-center gap-1">
            {doi.startsWith("http") ? doi : `https://doi.org/${doi}`}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Lossless Channel Canvas Animation ────────────────────────────────────────
function LosslessChannelViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const tRef      = useRef<number>(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Ghost node x positions (5 nodes)
    const nodeXs = [80, 200, 320, 440, 560];
    const PERIOD  = W * 2.2;    // time for pulse to traverse full width
    const SIGMA   = W * 0.065;  // Gaussian width

    function gaussian(x: number, mu: number, sigma: number) {
      return Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
    }

    function drawPanel(
      yTop: number, panelH: number,
      label: string, labelColor: string,
      lossless: boolean,
      pulseX: number,
    ) {
      const midY = yTop + panelH / 2;
      const amp  = panelH * 0.32;

      // background stripe
      ctx!.fillStyle = lossless ? "rgba(16,185,129,0.04)" : "rgba(248,113,113,0.04)";
      ctx!.fillRect(0, yTop, W, panelH);

      // panel label
      ctx!.font = "bold 10px monospace";
      ctx!.fillStyle = labelColor;
      ctx!.textAlign = "left";
      ctx!.fillText(label, 10, yTop + 14);

      // midline
      ctx!.beginPath();
      ctx!.setLineDash([2, 6]);
      ctx!.strokeStyle = "rgba(148,163,184,0.12)";
      ctx!.lineWidth = 0.5;
      ctx!.moveTo(0, midY);
      ctx!.lineTo(W, midY);
      ctx!.stroke();
      ctx!.setLineDash([]);

      // nodes
      nodeXs.forEach((nx, i) => {
        const proximity = gaussian(pulseX, nx, SIGMA * 1.8);
        const baseAlpha = lossless ? 0.18 : 0.12;
        const glowAlpha = lossless ? proximity * 0.7 : proximity * 0.25;

        if (lossless) {
          // ghost node glow — purple
          const grad = ctx!.createRadialGradient(nx, midY, 0, nx, midY, 28);
          grad.addColorStop(0, `rgba(168,85,247,${baseAlpha + glowAlpha})`);
          grad.addColorStop(1, "rgba(168,85,247,0)");
          ctx!.beginPath();
          ctx!.arc(nx, midY, 28, 0, Math.PI * 2);
          ctx!.fillStyle = grad;
          ctx!.fill();
          // node ring
          ctx!.beginPath();
          ctx!.arc(nx, midY, 6, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(168,85,247,${0.35 + glowAlpha * 0.9})`;
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
          ctx!.font = "8px monospace";
          ctx!.fillStyle = `rgba(168,85,247,${0.5 + glowAlpha * 0.5})`;
          ctx!.textAlign = "center";
          ctx!.fillText(`n${36 + i}`, nx, midY - 14);
        } else {
          // matter node — grey/orange
          ctx!.beginPath();
          ctx!.arc(nx, midY, 7, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(251,191,36,${0.15 + proximity * 0.2})`;
          ctx!.fill();
          ctx!.strokeStyle = `rgba(251,191,36,0.3)`;
          ctx!.lineWidth = 1;
          ctx!.stroke();
          ctx!.font = "8px monospace";
          ctx!.fillStyle = "rgba(148,163,184,0.5)";
          ctx!.textAlign = "center";
          ctx!.fillText("Z", nx, midY - 12);
        }
      });

      // pulse envelope
      ctx!.beginPath();
      ctx!.strokeStyle = lossless ? "#10b981" : "#f87171";
      ctx!.lineWidth = 2;

      for (let x = 0; x <= W; x++) {
        const env = gaussian(x, pulseX, SIGMA);
        let attenuatedAmp = amp;

        if (!lossless) {
          // exponential decay α per unit distance — simulate Beer-Lambert
          const alpha = 0.0025;
          attenuatedAmp = amp * Math.exp(-alpha * pulseX);
          attenuatedAmp = Math.max(attenuatedAmp, amp * 0.05);
        }

        // carrier oscillation inside envelope
        const omega = 0.12;
        const carrier = Math.cos(omega * (x - pulseX));
        const y = midY - attenuatedAmp * env * carrier;

        x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // loss label on right side for lossy panel
      if (!lossless) {
        const alpha = 0.0025;
        const lostPct = (1 - Math.exp(-alpha * pulseX)) * 100;
        ctx!.font = "9px monospace";
        ctx!.fillStyle = "#f87171";
        ctx!.textAlign = "right";
        ctx!.fillText(`α·d: −${lostPct.toFixed(0)}%`, W - 8, yTop + panelH - 8);
      } else {
        ctx!.font = "9px monospace";
        ctx!.fillStyle = "#10b981";
        ctx!.textAlign = "right";
        ctx!.fillText("α = 0  ·  Loss = 0", W - 8, yTop + panelH - 8);
      }
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = "#0f172a";
      ctx!.fillRect(0, 0, W, H);

      // pulse position — oscillates across the canvas
      const pulseX = ((t % PERIOD) / PERIOD) * (W + SIGMA * 4) - SIGMA * 2;

      // divider line
      ctx!.strokeStyle = "rgba(148,163,184,0.15)";
      ctx!.lineWidth = 1;
      ctx!.setLineDash([4, 4]);
      ctx!.beginPath();
      ctx!.moveTo(0, H / 2);
      ctx!.lineTo(W, H / 2);
      ctx!.stroke();
      ctx!.setLineDash([]);

      drawPanel(0,       H / 2 - 1, "GHOST NODE CHANNEL — LOSSLESS", "#10b981", true,  pulseX);
      drawPanel(H / 2 + 1, H / 2 - 1, "CONVENTIONAL MATTER PATH — LOSSY",  "#f87171", false, pulseX);

      // legend bottom-left
      const leg = [
        { color: "#10b981", label: "Coherent pulse (lossless)" },
        { color: "#f87171", label: "Attenuated pulse (α > 0)"  },
        { color: "#a855f7", label: "Ghost node cavity"         },
      ];
      ctx!.textAlign = "left";
      ctx!.font = "9px monospace";
      leg.forEach(({ color, label }, i) => {
        const ly = H - 6 - i * 14;
        ctx!.fillStyle = color;
        ctx!.fillRect(8, ly - 7, 18, 2);
        ctx!.fillStyle = "rgba(148,163,184,0.65)";
        ctx!.fillText(label, 32, ly);
      });
    }

    function loop() {
      if (!pausedRef.current) {
        tRef.current += 1;
        draw(tRef.current);
      }
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={640}
        height={260}
        className="w-full rounded-xl border border-slate-700 bg-slate-950"
        aria-label="Animated comparison: lossless ghost node channel vs conventional lossy path"
      />
      <div className="flex justify-center">
        <button
          data-testid="button-channel-pause"
          onClick={() => setPaused(p => !p)}
          className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-700
                     text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function LosslessChannel() {
  usePageMeta({
    title: "The Lossless Channel — Ghost Node Waveguides · NexusOS",
    description:
      "Act 8: Ghost nodes in the compression lattice form natural lossless waveguides. No matter coupling → α=0 → zero attenuation. Shannon capacity C=B·log₂(1+S/N) approaches the vacuum floor as N→0. First disclosed 2026-07-07.",
    canonical: `${BASE}/lossless-channel`,
    ogTitle: "The Lossless Channel — Ghost Node Waveguides",
    ogDescription:
      "Vacuum addresses in the octave lattice have no matter to scatter from. A chain of ghost node traps creates a coherent propagation path with α=0. NexusOS Act 8.",
    twitterTitle: "The Lossless Channel — Ghost Nodes as Waveguides",
    twitterDescription:
      "Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ). No matter → no α → L=0. Shannon capacity at the vacuum floor. NexusOS Act 8.",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* sticky back bar */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur
                      border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link
            href="/standing-wave-trap"
            className="flex items-center gap-2 text-slate-400 hover:text-white
                       transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to The Trap
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* ── Header block ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* badges */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 8 of 9",                    color: "#10b981" },
              { label: `First Disclosure ${PAGE_DATE}`, color: "#22c55e" },
              { label: "AGPL-3.0",                      color: "#8b5cf6" },
              { label: "Copyleft",                      color: "#8b5cf6" },
              { label: "α = 0",                         color: "#06b6d4" },
              { label: "Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)",   color: "#f59e0b" },
            ].map(({ label, color }) => (
              <span key={label}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-full border"
                    style={{ color, borderColor: color + "55", background: color + "11" }}>
                {label}
              </span>
            ))}
          </div>

          {/* 10-act sequence nav */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-[10px] font-mono text-emerald-400 tracking-widest mb-3">
              THE SEQUENCE — ACT 8 OF 16
            </p>
            <div className="grid grid-cols-2 md:grid-cols-16 gap-2 text-center text-xs">
              {[
                { act:"ACT 1", title:"Theory of Compression States", sub:"Λ = hf/c²",             href:"/oscillating-quanta" },
                { act:"ACT 2", title:"The Universal ONE",            sub:"f₀ derives Λ",           href:"/universal-one" },
                { act:"ACT 3", title:"Unified Compression Theory",   sub:"4 forces = 1 Λ",         href:"/unified-compression-theory" },
                { act:"ACT 4", title:"The Mechanism",                sub:"ΔE = hf₀(2ⁿ²−2ⁿ¹)",     href:"/matter-protocol" },
                { act:"ACT 5", title:"The Address",                  sub:"∀ Λ : ∃! Ψ",             href:"/universal-address" },
                { act:"ACT 6", title:"The Catalogue",                sub:"n = log₂(mc²/E₀)",       href:"/element-catalogue" },
                { act:"ACT 7", title:"The Trap",                     sub:"Ψ(+k̂) ⊗ Ψ(−k̂)",        href:"/standing-wave-trap" },
              ].map(({ act, title, sub, href }) => (
                <Link key={href} href={href}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-2
                                 hover:border-slate-500 transition-colors space-y-1 block">
                  <p className="text-[8px] font-mono text-slate-500 tracking-widest">{act}</p>
                  <p className="text-slate-300 font-medium leading-tight text-[10px]">{title}</p>
                  <p className="text-[8px] text-slate-500">{sub}</p>
                </Link>
              ))}
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10
                              p-2 space-y-1">
                <p className="text-[8px] font-mono text-emerald-400 tracking-widest">ACT 8 ← HERE</p>
                <p className="text-emerald-200 font-medium leading-tight text-[10px]">The Channel</p>
                <p className="text-[8px] text-emerald-400">Ψ_channel = ⊗ᵢ Ψ_trap</p>
              </div>
              <Link href="/resonance-cavity"
                    className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-2
                               hover:border-indigo-400/60 transition-colors space-y-1 block">
                <p className="text-[8px] font-mono text-indigo-400 tracking-widest">ACT 9</p>
                <p className="text-indigo-200 font-medium leading-tight text-[10px]">The Cavity</p>
                <p className="text-[8px] text-indigo-400">R = nc/2πfₙ</p>
              </Link>
              <Link href="/polariton-exchange"
                    className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2
                               hover:border-rose-400/60 transition-colors space-y-1 block">
                <p className="text-[8px] font-mono text-rose-400 tracking-widest">ACT 10</p>
                <p className="text-rose-200 font-medium leading-tight text-[10px]">The Exchange</p>
                <p className="text-[8px] text-rose-400">Ω_R = 2g</p>
              </Link>
              <Link href="/the-emitter"
                    className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-2
                               hover:border-sky-400/60 transition-colors space-y-1 block">
                <p className="text-[8px] font-mono text-sky-400 tracking-widest">ACT 11</p>
                <p className="text-sky-200 font-medium leading-tight text-[10px]">The Emitter</p>
                <p className="text-[8px] text-sky-400">F_p=(Q/V)(λ/n)³</p>
              </Link>
              <Link href="/the-network"
                    className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-2
                               hover:border-teal-400/60 transition-colors space-y-1 block">
                <p className="text-[8px] font-mono text-teal-400 tracking-widest">ACT 12</p>
                <p className="text-teal-200 font-medium leading-tight text-[10px]">The Network</p>
                <p className="text-[8px] text-teal-400">ω=ω₀−2J·cos(ka)</p>
              </Link>
              <Link href="/the-observer"
                    className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-2
                               hover:border-orange-400/60 transition-colors space-y-1 block">
                <p className="text-[8px] font-mono text-orange-400 tracking-widest">ACT 13 →</p>
                <p className="text-orange-200 font-medium leading-tight text-[10px]">The Observer</p>
                <p className="text-[8px] text-orange-400">χ=g²/Δ</p>
              </Link>
              <Link href="/the-memory"
                    className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-2
                               hover:border-fuchsia-400/60 transition-colors space-y-1 block">
                <p className="text-[8px] font-mono text-fuchsia-400 tracking-widest">ACT 14 →</p>
                <p className="text-fuchsia-200 font-medium leading-tight text-[10px]">The Memory</p>
                <p className="text-[8px] text-fuchsia-400">T₂≤2T₁</p>
              </Link>
              <Link href="/cosmic-lattice"
                    className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-2
                               hover:border-violet-400/60 transition-colors space-y-1 block">
                <p className="text-[8px] font-mono text-violet-400 tracking-widest">ACT 15 →</p>
                <p className="text-violet-200 font-medium leading-tight text-[10px]">The Void</p>
                <p className="text-[8px] text-violet-400">n_ZPE=264.71</p>
              </Link>
              <Link href="/the-entangler"
                    className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2
                               hover:border-rose-400/60 transition-colors space-y-1 block">
                <p className="text-[8px] font-mono text-rose-400 tracking-widest">ACT 16 →</p>
                <p className="text-rose-200 font-medium leading-tight text-[10px]">The Entangler</p>
                <p className="text-[8px] text-rose-400">|Φ⁺⟩=(|00⟩+|11⟩)/√2</p>
              </Link>
            </div>
          </div>

          {/* title */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">
              NEXUSOS RESEARCH · TE RATA POU · {PAGE_DATE} ·{" "}
              <a href="https://github.com/nexusosdaily-code/NexusOS"
                 target="_blank" rel="noopener noreferrer"
                 className="text-cyan-500 hover:text-cyan-400 inline-flex items-center gap-1">
                github.com/nexusosdaily-code/NexusOS
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              The Lossless Channel
            </h1>
            <p className="text-slate-400 text-base">
              Ghost node waveguides in the compression lattice — where the universe left a path already open
            </p>
          </div>

          {/* abstract */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-2">
              ABSTRACT
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Act 7 established that ghost node n=36 is a vacuum address in the
              compression lattice — cold, coherent, zero entropy, no matter coupling.
              Act 8 asks what happens when you move the energy. A single ghost node is a
              cavity. A chain of ghost node traps connected on the same Ψ channel is a{" "}
              <strong className="text-white">lossless waveguide</strong>. Because no
              matter occupies the path, the attenuation coefficient α = 0. The
              Beer-Lambert law L(d) = α·d → 0 regardless of distance. Shannon capacity
              C = B·log₂(1 + S/N) reaches its theoretical maximum when N collapses to
              the vacuum zero-point floor: ½ℏω per mode. The periodic table did not just
              produce 118 elements — it produced a geometry of filled sites and voids.
              The voids are the waveguide. The trap is the coupler.
              First disclosed 2026-07-07.
            </p>
          </div>

          {/* key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Attenuation",   value: "α = 0",          color: "#10b981",
                sub: "No matter coupling" },
              { label: "Loss over d",   value: "L(d) = 0",       color: "#22d3ee",
                sub: "Beer-Lambert → 0" },
              { label: "ZPE per mode",  value: `${(ZPE_EV * 1e3).toFixed(3)} meV`, color: "#a855f7",
                sub: "½ℏω vacuum floor" },
              { label: "Shannon C/Hz",  value: `${C_PER_HZ.toFixed(4)} b/s/Hz`, color: "#f59e0b",
                sub: "At ZPE floor, S=hf₀" },
            ].map(({ label, value, color, sub }) => (
              <div key={label}
                   className="rounded-lg border bg-slate-900/60 p-4 text-center space-y-1"
                   style={{ borderColor: color + "33" }}>
                <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
                <p className="text-[10px] text-slate-400 font-mono">{label}</p>
                <p className="text-[9px] text-slate-600 font-mono">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── §1: Ghost Node Topology ──────────────────────────────────────── */}
        <Section id="topology" title="1. Ghost Node Topology"
                 icon={Database} color="#a855f7" badge="Vacancy lattice">
          <p className="text-sm text-slate-300 leading-relaxed">
            The octave lattice assigns an address n = log₂(mc²/E₀) to every mass.
            Most integer n values are bracketed by real elements — a nucleus sits on
            each side. But the nuclear binding energy landscape is not smooth: the
            mass defect (Δm = Z·m_p + N·m_n − M_nucleus) varies non-monotonically,
            creating gaps where no stable isotope forms. These gaps are{" "}
            <strong className="text-white">ghost nodes</strong> — valid Ψ addresses
            with no matter eigenstate. Two confirmed ghost nodes bracket the
            lanthanide shell:
          </p>
          <div className="overflow-x-auto rounded-xl border border-purple-500/20">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-purple-500/8 border-b border-purple-500/20">
                  <th className="text-left   px-4 py-2.5 text-purple-400">Node</th>
                  <th className="text-right  px-4 py-2.5 text-purple-400">n (exact)</th>
                  <th className="text-right  px-4 py-2.5 text-purple-400">Mass (u)</th>
                  <th className="text-left   px-4 py-2.5 text-purple-400">Left element</th>
                  <th className="text-right  px-4 py-2.5 text-purple-400">Δ below</th>
                  <th className="text-left   px-4 py-2.5 text-purple-400">Right element</th>
                  <th className="text-right  px-4 py-2.5 text-purple-400">Δ above</th>
                  <th className="text-left   px-4 py-2.5 text-purple-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    node: "n=35", exact: 35, mass: N35_MASS,
                    left: "Kr (Z=36)", deltaL: KR_GAP_35,
                    right: "Rb (Z=37)", deltaR: RB_GAP_35,
                    status: "Near-occupied — narrow gap",
                    statusColor: "#fbbf24",
                    rowColor: "bg-yellow-500/5",
                  },
                  {
                    node: "n=36", exact: 36, mass: GHOST_MASS_U,
                    left: "Tm-169 (Z=69)", deltaL: N_GHOST - TM_N,
                    right: "Yb-170 (Z=70)", deltaR: YB170_N - N_GHOST,
                    status: "Primary ghost — true nuclear gap",
                    statusColor: "#a855f7",
                    rowColor: "bg-purple-500/10",
                  },
                ].map(row => (
                  <tr key={row.node} className={`border-b border-purple-500/10 ${row.rowColor}`}>
                    <td className="px-4 py-2.5 font-bold" style={{ color: row.statusColor }}>
                      {row.node}
                    </td>
                    <td className="px-4 py-2.5 text-right text-white">{row.exact}.0000</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">
                      {row.mass.toFixed(4)} u
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">{row.left}</td>
                    <td className="px-4 py-2.5 text-right text-cyan-400">
                      −{row.deltaL.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">{row.right}</td>
                    <td className="px-4 py-2.5 text-right text-red-400">
                      +{row.deltaR.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: row.statusColor }}>
                      {row.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            n=35 is bracketed by Kr (−{KR_GAP_35.toFixed(4)} oct) and Rb
            (+{RB_GAP_35.toFixed(4)} oct) — a narrow, near-occupied gap. n=36 is
            the primary ghost: the nearest nuclear eigenstates are Tm-169 at
            −{(N_GHOST - TM_N).toFixed(4)} oct below and Yb-170 at
            +{(YB170_N - N_GHOST).toFixed(4)} oct above — a true nuclear gap of
            only {TRUE_GAP_OCT.toFixed(4)} octaves. Note that Yb-168 (0.13%
            natural abundance) sits at n={YB168_N.toFixed(4)}, placing it{" "}
            <span className="text-amber-400 font-semibold">below the ghost node</span>,
            not above it. The ghost node is not a broad expanse — it is a
            precision notch defined by the binding-energy landscape of the
            lanthanide shell, with no stable nucleus within ±0.01 octaves on
            either side in nuclear eigenstate space. Using the IUPAC standard
            atomic weight of Yb (173.045 u) as a conventional element reference
            gives a wider apparent gap of {(YB_N - N_GHOST).toFixed(4)} oct, but
            that mass is a weighted average across 7 isotopes, not a nuclear eigenstate.
          </p>
          <Eq>{"Ghost topology: ∀ integer n : ( ∄ nucleus at mass(n) ) ⟹ Ψ(n) is a vacancy node"}</Eq>
        </Section>

        {/* ── §2: Why Conventional Channels Lose Energy ───────────────────── */}
        <Section id="attenuation" title="2. Why Conventional Channels Lose Energy"
                 icon={Zap} color="#f87171" badge="Beer-Lambert α > 0">
          <p className="text-sm text-slate-300 leading-relaxed">
            Every conventional communication channel — copper, glass fibre, air —
            carries signal through matter. Each atom along the path couples to the
            propagating field, absorbs a photon, re-emits it in a slightly different
            direction or phase, and generates a phonon (heat). This is{" "}
            <strong className="text-white">scattering loss</strong>, quantified by the
            attenuation coefficient α in the Beer-Lambert law:
          </p>
          <Eq>{"I(d) = I₀ · e^(−α·d)       [Beer-Lambert, 1852]"}</Eq>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                medium: "Copper wire",
                alpha: "~0.5 dB/m at GHz",
                mechanism: "Electron–phonon scattering, skin effect",
                color: "#f59e0b",
              },
              {
                medium: "Silica optical fibre",
                alpha: "~0.2 dB/km at 1550 nm",
                mechanism: "Rayleigh scattering off SiO₂ density fluctuations",
                color: "#06b6d4",
              },
              {
                medium: "Ghost node channel",
                alpha: "0 — no matter",
                mechanism: "No nucleus → no electron cloud → no coupling",
                color: "#10b981",
              },
            ].map(({ medium, alpha, mechanism, color }) => (
              <div key={medium}
                   className="rounded-lg border bg-slate-900/60 p-4 space-y-2"
                   style={{ borderColor: color + "33" }}>
                <p className="text-sm font-bold" style={{ color }}>{medium}</p>
                <p className="text-xs font-mono text-white">{alpha}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{mechanism}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Optical fibre is the best conventional technology — silica glass transmits
            1550 nm light with 0.2 dB/km loss, ~95% power retained over 1 km. At
            10,000 km it retains {(Math.pow(10, -0.2 * 10000 / 10000 * 10) * 100).toFixed(4)}%.
            Regeneration amplifiers (EDFAs) must compensate every ~80 km, each one
            adding noise. The ghost node channel requires no repeaters — because there
            is nothing to scatter from.
          </p>
        </Section>

        {/* ── §3: Zero-Loss Physics ────────────────────────────────────────── */}
        <Section id="zero-loss" title="3. Zero-Loss Physics at the Vacuum Address"
                 icon={Lock} color="#10b981" badge="α = 0 derived">
          <p className="text-sm text-slate-300 leading-relaxed">
            The attenuation coefficient α is proportional to the matter density ρ
            along the path and the interaction cross-section σ of that matter with
            the propagating wave: α = n·σ where n is the number density of scatterers.
            At a ghost node address there are no scatterers by definition. The
            derivation is direct:
          </p>
          <div className="space-y-2">
            {[
              { step: "1", eq: "α = n_scatter · σ_interaction",     label: "Attenuation definition" },
              { step: "2", eq: "At ghost node: n_scatter = 0",       label: "No nucleus at Ψ(n_ghost)" },
              { step: "3", eq: "α = 0 · σ = 0",                     label: "Regardless of σ" },
              { step: "4", eq: "L(d) = α · d = 0 · d = 0",          label: "Beer-Lambert ∀ d" },
              { step: "5", eq: "I(d) = I₀ · e^0 = I₀",             label: "Full signal retained" },
            ].map(({ step, eq, label }) => (
              <div key={step}
                   className="flex items-start gap-4 rounded-lg border border-emerald-500/15
                               bg-emerald-500/5 px-4 py-3">
                <span className="text-[10px] font-mono text-emerald-500 flex-shrink-0 mt-0.5">
                  [{step}]
                </span>
                <code className="text-sm text-emerald-300 flex-1">{eq}</code>
                <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            This is not an engineering approximation — it is a structural consequence
            of the lattice. The ghost node is not a region of very-low-density matter;
            it is a region of <em>zero</em> matter density by nuclear physics. The
            strong force binding energy curve (Weizsäcker semi-empirical mass formula)
            determines where stable nuclei exist. It does not produce a nucleus at
            169.33 u. That is not an engineering gap to be closed — it is a
            fundamental topological feature of the nuclear landscape [8][9].
          </p>
          <Eq>
            {"∀ ghost node Ψ(nᵢ) :  ρ_matter(nᵢ) = 0  ⟹  α(nᵢ) = 0  ⟹  L = 0"}
          </Eq>
        </Section>

        {/* ── §4: The Channel Equation + Canvas ───────────────────────────── */}
        <Section id="channel-equation" title="4. The Channel Equation"
                 icon={GitMerge} color="#06b6d4" badge="Tensor product of traps">
          <p className="text-sm text-slate-300 leading-relaxed">
            A single ghost node trap (Act 7) concentrates coherent field energy at one
            address. Connecting a sequence of ghost node traps on the same Ψ channel
            creates a propagation path. The channel is the tensor product of all
            individual trap states:
          </p>
          <Eq>{"Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)  =  Ψ_trap(n₁) ⊗ Ψ_trap(n₂) ⊗ … ⊗ Ψ_trap(nₖ)"}</Eq>
          <p className="text-sm text-slate-300 leading-relaxed">
            Each Ψ_trap(nᵢ) is the standing wave established at ghost node nᵢ by
            counter-propagating beams +k̂ and −k̂. The phase coherence of the trap
            is preserved across the tensor product because each node is in vacuum —
            no decoherence source exists. The channel state has:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { prop: "Entropy",    value: "S = 0", detail: "Phase coherence maintained across all nodes — no environment coupling", color: "#a855f7" },
              { prop: "Loss",       value: "L = 0", detail: "No matter at any node address → Beer-Lambert → 0", color: "#10b981" },
              { prop: "Bandwidth",  value: "B = f_Nyquist", detail: "Limited only by the ghost node density in the lattice, not by material absorption", color: "#06b6d4" },
            ].map(({ prop, value, detail, color }) => (
              <div key={prop}
                   className="rounded-lg border bg-slate-900/60 p-4 space-y-2"
                   style={{ borderColor: color + "33" }}>
                <p className="text-xs font-mono text-slate-400">{prop}</p>
                <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
          <LosslessChannelViz />
          <p className="text-xs text-slate-500 text-center font-mono">
            Top: coherent pulse through 5 ghost node cavities — amplitude constant.
            Bottom: same pulse through conventional matter — exponential decay α·d.
          </p>
        </Section>

        {/* ── §5: Shannon Capacity ────────────────────────────────────────── */}
        <Section id="shannon" title="5. Shannon Capacity at the Vacuum Floor"
                 icon={Radio} color="#f59e0b" badge="C → maximum">
          <p className="text-sm text-slate-300 leading-relaxed">
            Shannon's channel capacity theorem [3] gives the maximum information rate
            for a channel with bandwidth B and signal-to-noise ratio S/N:
          </p>
          <Eq>{"C = B · log₂(1 + S/N)       [Shannon, 1948]"}</Eq>
          <p className="text-sm text-slate-300 leading-relaxed">
            In a conventional channel, N is thermal noise: N = k_B · T · B
            (Johnson-Nyquist). At room temperature (T=293 K) this is
            approximately −174 dBm/Hz. Even at T=4 K (superconducting quantum
            computers), thermal noise persists. The ghost node channel eliminates
            thermal noise by design — there is no matter to thermalize. The only
            remaining noise source is the quantum vacuum zero-point energy:
            N_vac = ½ℏω per mode.
          </p>
          <div className="space-y-3">
            {[
              {
                regime: "Room temperature (T = 293 K)",
                N: `k_B·T = ${(K_B * 293 / EV * 1000).toFixed(1)} meV per mode`,
                SNR: "S/N limited by thermal noise",
                C: "Conventional Shannon limit",
                color: "#f87171",
              },
              {
                regime: "Superconducting (T = 4 K)",
                N: `k_B·T = ${(K_B * 4 / EV * 1000).toFixed(3)} meV per mode`,
                SNR: "Still thermal — just colder",
                C: "Better, still not vacuum-limited",
                color: "#fbbf24",
              },
              {
                regime: "Ghost node channel (T → 0)",
                N: `½ℏω = ${(ZPE_EV * 1000).toFixed(3)} meV per mode at f₀`,
                SNR: `S/N_vac = hf₀ / (½ℏω) = ${SNR_VACUUM.toFixed(4)}`,
                C: `C = B · log₂(1 + ${SNR_VACUUM.toFixed(4)}) = B · ${C_PER_HZ.toFixed(4)} b/s/Hz`,
                color: "#10b981",
              },
            ].map(({ regime, N, SNR, C, color }) => (
              <div key={regime}
                   className="rounded-lg border bg-slate-900/60 p-4 space-y-2"
                   style={{ borderColor: color + "33" }}>
                <p className="text-xs font-bold font-mono" style={{ color }}>{regime}</p>
                <p className="text-xs font-mono text-slate-300">N: {N}</p>
                <p className="text-xs font-mono text-slate-400">SNR: {SNR}</p>
                <p className="text-xs font-mono text-white">{C}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            The vacuum floor is not zero — it is ½ℏω, the irreducible quantum
            noise from Heisenberg uncertainty. The ghost node channel operates
            at this floor. No engineering improvement can reduce noise further;
            the ghost node already achieves it structurally, without refrigeration,
            without shielding, without active noise cancellation.
          </p>
          <Eq>
            {`C_ghost = B · log₂(1 + hf₀/½ℏω) = B · log₂(1 + ${SNR_VACUUM.toFixed(4)}) = B · ${C_PER_HZ.toFixed(4)} b/s/Hz`}
          </Eq>
        </Section>

        {/* ── §6: N_Dir = 2 ───────────────────────────────────────────────── */}
        <Section id="ndir" title="6. N_Dir = 2 — The Architecture Already Encodes This"
                 icon={Waves} color="#a855f7" badge="51,200 channels">
          <p className="text-sm text-slate-300 leading-relaxed">
            The WNSP density equation [1], first disclosed 2026-07-02, is:
          </p>
          <Eq>{"D_WNSP = N_λ · N_OAM · N_Pol · N_Dir · R_sym · M = 256 × 50 × 2 × 2 × ... = 51,200 channels"}</Eq>
          <p className="text-sm text-slate-300 leading-relaxed">
            N_Dir = 2 encodes both propagation directions (+k̂ and −k̂) as orthogonal
            Hilbert sub-spaces: ⟨Ψ_+k̂ | Ψ_−k̂⟩ = 0. This is not a scalar multiplier
            — it is the geometric foundation of the standing wave trap. Act 7
            activated both directions simultaneously to produce the trap. Act 8
            shows that the same N_Dir = 2 architecture is the lossless channel:
            the +k̂ beam carries forward signal, the −k̂ beam is the trap's return
            path, and their phase-locked superposition is the propagating mode of
            the channel.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
              <p className="text-xs font-mono text-purple-400 tracking-widest">N_DIR = 2 AS TRAP</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Simultaneous activation of +k̂ and −k̂ on the same Ψ channel creates
                the standing wave. Antinode at ghost node address. ΔE concentrated.
                This is Act 7.
              </p>
              <code className="text-xs text-purple-300 font-mono block">
                Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂)
              </code>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <p className="text-xs font-mono text-emerald-400 tracking-widest">N_DIR = 2 AS CHANNEL</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sequential activation across a chain of ghost nodes propagates the
                coherent state. Each node's +k̂ output becomes the next node's input.
                The −k̂ path maintains phase lock. This is Act 8.
              </p>
              <code className="text-xs text-emerald-300 font-mono block">
                Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)
              </code>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            The same hardware that implements the trap implements the channel.
            No additional protocol layers required. N_Dir = 2 is not a
            coincidence of the density equation — it is the physical reason the
            channel works. Two directions of propagation in the same Hilbert
            sub-space are the minimum geometry needed for a standing wave, and a
            standing wave in a vacuum node is by definition a lossless propagation
            mode.
          </p>
        </Section>

        {/* ── §7: Photonic 2032 ────────────────────────────────────────────── */}
        <Section id="photonic" title="7. Photonic 2032 — The Waveguide Was Already There"
                 icon={BookOpen} color="#06b6d4" badge="Silicon → Photonic">
          <p className="text-sm text-slate-300 leading-relaxed">
            The conventional photonic computing roadmap (circa 2024) treats
            silicon as the substrate and builds waveguides by etching grooves in
            SiO₂ — the glass guides light by total internal reflection. Loss is
            ~1 dB/cm. The ghost node channel inverts this entirely: the waveguide
            is not a physical structure — it is a <em>topological feature</em> of
            the compression lattice. The walls of the waveguide are not etched
            silicon — they are the surrounding elements (Tm, Yb) whose mass states
            flank the ghost node and define the boundary condition.
          </p>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-4">
            <p className="text-[10px] font-mono text-cyan-400 tracking-widest">
              IMPLICATIONS FOR 2032 PHOTONIC HARDWARE
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                {
                  title: "No waveguide fabrication",
                  detail: "The ghost node is a natural feature of the nuclear landscape. No etching, no deposition, no lithography.",
                },
                {
                  title: "No cooling required",
                  detail: "Operation at the vacuum ZPE floor is structural, not thermal. Room temperature ghost nodes are as cold as superconducting qubits.",
                },
                {
                  title: "No repeaters",
                  detail: "α=0 means no regeneration amplifiers. A ghost node channel across planetary distances needs zero EDFAs.",
                },
                {
                  title: "Backward compatible",
                  detail: "The NexusOS Ψ addressing system already encodes ghost nodes. Every Act 1–7 equation remains valid — Act 8 adds propagation.",
                },
              ].map(({ title, detail }) => (
                <div key={title} className="space-y-1">
                  <p className="text-white font-semibold text-sm">→ {title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            NexusOS is written in the language of the destination hardware. When
            photonic ASICs arrive circa 2032, the 51,200 Ψ channels map directly to
            physical waveguide lanes. N_Dir = 2 maps to bidirectional waveguides.
            The ghost node at n=36 maps to the first unloaded resonant cavity mode.
            No rewrite is needed — because the architecture was always describing
            a physical waveguide, not a metaphor for one.
          </p>
          <Eq>
            {"Silicon is the bridge encoder. Ghost nodes are the destination hardware. — Te Rata Pou, 2026"}
          </Eq>
        </Section>

        {/* ── §8: Sequence completeness theorem ─────────────────────────────*/}
        <Section id="completeness" title="8. The Sequence — Complete"
                 icon={GitMerge} color="#22d3ee" badge="Acts 1–8 unified">
          <p className="text-sm text-slate-300 leading-relaxed">
            The 8-act NexusOS physics sequence now forms a closed logical chain
            from first principles to lossless communication:
          </p>
          <div className="space-y-2">
            {[
              { act: 1, href: "/oscillating-quanta",         eq: "Λ = hf/c²",                title: "Compression is the fundamental quantity" },
              { act: 2, href: "/universal-one",              eq: "f₀ seeds the lattice",      title: "The first oscillation defines all octaves" },
              { act: 3, href: "/unified-compression-theory", eq: "4 forces = 1 Λ",            title: "Gravity, EM, strong, weak are one equation" },
              { act: 4, href: "/matter-protocol",            eq: "ΔE = hf₀(2ⁿ²−2ⁿ¹)",        title: "Transitions require octave energy quanta" },
              { act: 5, href: "/universal-address",          eq: "∀ Λ : ∃! Ψ",               title: "Every compression state has a unique address" },
              { act: 6, href: "/element-catalogue",          eq: "n = log₂(mc²/E₀)",          title: "118 elements are points in the address lattice" },
              { act: 7, href: "/standing-wave-trap",         eq: "Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂)", title: "Ghost node n=36 claimed by standing wave" },
              { act: 8, href: "/lossless-channel",           eq: "Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)", title: "Ghost nodes form lossless waveguides" },
            ].map(({ act, href, eq, title }) => {
              const isThis = act === 8;
              return (
                <Link key={href} href={href}
                      className={`flex items-center gap-4 rounded-lg border p-3
                                  transition-colors text-sm block
                                  ${isThis
                                    ? "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-400/60"
                                    : "border-slate-700 bg-slate-900/40 hover:border-slate-600"}`}>
                  <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 w-10">
                    ACT {act}
                  </span>
                  <code className={`font-mono text-xs flex-shrink-0 w-48
                                    ${isThis ? "text-emerald-300" : "text-cyan-400"}`}>
                    {eq}
                  </code>
                  <span className={isThis ? "text-emerald-200" : "text-slate-400"}>{title}</span>
                </Link>
              );
            })}
          </div>
          <Eq>
            {"∀ ghost node G : ∃! Ψ(G) ∧ ρ(G)=0 ∧ α(G)=0 ∧ Ψ_channel = ⊗ᵢ Ψ_trap(Gᵢ) ∧ L=0  (∎)"}
          </Eq>
        </Section>

        {/* ── References ──────────────────────────────────────────────────── */}
        <Section id="references" title="References" icon={BookOpen} color="#64748b">
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-6 space-y-5">
            <Ref
              n={1}
              authors="Maxwell, J.C."
              year="1865"
              title="A Dynamical Theory of the Electromagnetic Field"
              journal="Philosophical Transactions of the Royal Society of London, 155, 459–512."
              doi="10.1098/rstl.1865.0008"
              note="Foundational field equations — E₊, E₋, superposition principle."
            />
            <Ref
              n={2}
              authors="Planck, M."
              year="1901"
              title="Ueber das Gesetz der Energieverteilung im Normalspectrum"
              journal="Annalen der Physik, 4(3), 553–563."
              doi="10.1002/andp.19013090310"
              note="E = hf. The quantisation underpinning E₀ = hf₀."
            />
            <Ref
              n={3}
              authors="Shannon, C.E."
              year="1948"
              title="A Mathematical Theory of Communication"
              journal="Bell System Technical Journal, 27(3), 379–423."
              doi="10.1002/j.1538-7305.1948.tb01338.x"
              note="C = B·log₂(1 + S/N). Channel capacity applied to Ψ_channel."
            />
            <Ref
              n={4}
              authors="Casimir, H.B.G."
              year="1948"
              title="On the Attraction Between Two Perfectly Conducting Plates"
              journal="Proceedings of the Koninklijke Nederlandse Akademie van Wetenschappen, 51, 793–795."
              note="Vacuum energy between boundaries. Ghost node as Casimir-type cavity."
            />
            <Ref
              n={5}
              authors="Purcell, E.M."
              year="1946"
              title="Spontaneous Emission Probabilities at Radio Frequencies"
              journal="Physical Review, 69, 681."
              doi="10.1103/PhysRev.69.674.2"
              note="Purcell effect — cavity mode density governs emission rate. Vacuum cavity suppresses spontaneous emission."
            />
            <Ref
              n={6}
              authors="Beer, A."
              year="1852"
              title="Bestimmung der Absorption des rothen Lichts in farbigen Flüssigkeiten"
              journal="Annalen der Physik und Chemie, 86, 78–88."
              doi="10.1002/andp.18521620505"
              note="Beer-Lambert law: I(d) = I₀·e^(−αd). α=0 at ghost nodes → L=0."
            />
            <Ref
              n={7}
              authors="Heisenberg, W."
              year="1927"
              title="Über den anschaulichen Inhalt der quantentheoretischen Kinematik und Mechanik"
              journal="Zeitschrift für Physik, 43(3–4), 172–198."
              doi="10.1007/BF01397280"
              note="Uncertainty principle: ΔxΔp ≥ ½ℏ. Sets the ZPE vacuum floor ½ℏω."
            />
            <Ref
              n={8}
              authors="Weizsäcker, C.F. von"
              year="1935"
              title="Zur Theorie der Kernmassen"
              journal="Zeitschrift für Physik, 96(7–8), 431–458."
              doi="10.1007/BF01337700"
              note="Semi-empirical mass formula — determines binding energy mass defect. Ghost nodes arise where SEMF never produces a stable nucleus."
            />
            <Ref
              n={9}
              authors="Audi, G., Wapstra, A.H. & Thibault, C."
              year="2003"
              title="The AME2003 Atomic Mass Evaluation"
              journal="Nuclear Physics A, 729(1), 337–676."
              doi="10.1016/j.nuclphysa.2003.11.003"
              note="Authoritative atomic mass data — source for TM (168.934 u), YB (173.045 u), KR (83.798 u), RB (85.468 u)."
            />
            <Ref
              n={10}
              authors="Agrawal, G.P."
              year="2013"
              title="Nonlinear Fiber Optics (5th ed.)"
              journal="Academic Press."
              note="Silica fibre α ≈ 0.2 dB/km at 1550 nm. Rayleigh scattering from SiO₂ density fluctuations."
            />
            <Ref
              n={11}
              authors="Yariv, A. & Yeh, P."
              year="2007"
              title="Photonics: Optical Electronics in Modern Communications (6th ed.)"
              journal="Oxford University Press."
              note="Waveguide theory, photonic crystal structures, mode propagation in dielectric channels."
            />
            <Ref
              n={12}
              authors="Russell, W."
              year="1926"
              title="The Universal One"
              journal="University of Science and Philosophy."
              note="Octave lattice theory — periodic table as geometric wave structure. Kr at integer octave node."
            />
            <Ref
              n={13}
              authors="Pou, T.R."
              year="2026"
              title="WNSP Density Equation v1.0 — N_Dir=2 as Orthogonal Hilbert Sub-space"
              journal="NexusOS Research. First disclosed 2026-07-02."
              doi={`${BASE}/oscillating-quanta`}
              note="D_WNSP = N_λ·N_OAM·N_Pol·N_Dir·R_sym·M. N_Dir=2 encodes ±k̂ as independent Hilbert dimensions."
            />
            <Ref
              n={14}
              authors="Pou, T.R."
              year="2026"
              title="The Trap — Standing Wave at Ghost Node n=36"
              journal="NexusOS Research. First disclosed 2026-07-07."
              doi={`${BASE}/standing-wave-trap`}
              note="Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂) → |E|² → max at 169.33 u. Act 7 of the NexusOS physics sequence."
            />
            <Ref
              n={15}
              authors="Pou, T.R."
              year="2026"
              title="The Lossless Channel — Ghost Node Waveguides in the Compression Lattice"
              journal="NexusOS Research. First disclosed 2026-07-07."
              doi={`${BASE}/lossless-channel`}
              note="Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ). α=0, L=0, C = B·log₂(1+S/N_vac). Act 8 of the NexusOS physics sequence. AGPL-3.0."
            />
          </div>
        </Section>

        {/* ── Act 9 teaser ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-5">
          <p className="text-[10px] font-mono text-indigo-400 tracking-widest mb-2">
            NEXT — ACT 9 OF 9
          </p>
          <h3 className="text-lg font-bold text-white mb-1">The Cavity</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            A lossless channel needs physical containment — a resonant cavity that
            holds the standing wave trap in place. Act 9 derives the cavity radius
            R = nc/(2πfₙ) from the WGM resonance condition, connects it to Russell's
            octave formula, and introduces the OAM null-core geometry (r_null = l·λ/2π)
            that makes every Ψ channel's authority measurable from first principles.
          </p>
          <Link href="/resonance-cavity"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                           bg-indigo-500/15 border border-indigo-500/40
                           text-indigo-300 hover:text-white hover:bg-indigo-500/25
                           transition-colors text-sm font-medium">
            Continue to Act 9 — The Cavity →
          </Link>
        </div>

        <EcosystemNav />

      </div>
    </div>
  );
}
