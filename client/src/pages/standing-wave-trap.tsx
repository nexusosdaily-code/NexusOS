import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { EcosystemNav } from "@/components/ecosystem-nav";
import {
  ArrowLeft, Waves, Circle, ExternalLink, Zap, Atom,
  GitMerge, Target, Radio, Lock,
} from "lucide-react";

// ── SI exact constants (identical to element-catalogue) ─────────────────────
const H_PLANCK = 6.62607015e-34;
const EV       = 1.602176634e-19;
const F0       = 555e12;
const E0       = H_PLANCK * F0;
const E0EV     = E0 / EV;
const AMU_EV   = 931_494_000;

function octaveOf(mass_u: number) {
  return Math.log2((mass_u * AMU_EV) / E0EV);
}

// ── Ghost node ───────────────────────────────────────────────────────────────
const N_GHOST      = 36;
const GHOST_MASS_U = (E0EV * Math.pow(2, N_GHOST)) / AMU_EV;

// ── Krypton (Z=36, floor) ────────────────────────────────────────────────────
const KR_MASS_U = 83.798;
const KR_N      = octaveOf(KR_MASS_U);

// ── Thulium (Z=69, ceiling) ───────────────────────────────────────────────────
const TM_MASS_U = 168.934;
const TM_N      = octaveOf(TM_MASS_U);
const TM_GAP    = N_GHOST - TM_N;

// ── Ytterbium (Z=70, first element past ghost) ───────────────────────────────
const YB_MASS_U  = 173.045;    // IUPAC standard atomic weight (conventional element reference)
const YB_N       = octaveOf(YB_MASS_U);
const YB170_MASS_U = 169.935;  // Yb-170 — nearest Yb isotope ABOVE ghost (true nuclear boundary)
const YB170_N    = octaveOf(YB170_MASS_U);

// ΔE to lift Tm to ghost node (MeV)
const DELTA_E_MEV = TM_MASS_U * (AMU_EV / 1e6) * (Math.pow(2, TM_GAP) - 1);

// Ghost WDM channel: frac(36) × 255 = 0 → SYSTEM band channel 0
const GHOST_WDM = Math.round((N_GHOST % 1) * 255);

function fmt4(n: number) { return n.toFixed(4); }

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

// ── Standing-wave canvas animation ──────────────────────────────────────────
function StandingWaveViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const tRef      = useRef<number>(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw(t: number) {
      const W   = canvas!.width;
      const H   = canvas!.height;
      const midY = H / 2;
      const amp  = H * 0.28;
      const k    = (2 * Math.PI) / W;
      const omega = 0.035;

      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = "#0f172a";
      ctx!.fillRect(0, 0, W, H);

      // midline
      ctx!.beginPath();
      ctx!.setLineDash([2, 6]);
      ctx!.strokeStyle = "rgba(148,163,184,0.15)";
      ctx!.lineWidth = 0.5;
      ctx!.moveTo(0, midY);
      ctx!.lineTo(W, midY);
      ctx!.stroke();
      ctx!.setLineDash([]);

      // +k̂ forward beam (blue dashed)
      ctx!.beginPath();
      ctx!.setLineDash([5, 4]);
      ctx!.strokeStyle = "#3b82f6";
      ctx!.lineWidth = 1.5;
      for (let x = 0; x <= W; x++) {
        const y = midY - amp * 0.5 * Math.cos(k * x - omega * t);
        x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // −k̂ return beam (red dashed)
      ctx!.beginPath();
      ctx!.strokeStyle = "#f87171";
      for (let x = 0; x <= W; x++) {
        const y = midY - amp * 0.5 * Math.cos(k * x + omega * t);
        x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      }
      ctx!.stroke();
      ctx!.setLineDash([]);

      // envelope (faint cyan)
      ctx!.beginPath();
      ctx!.strokeStyle = "rgba(34,211,238,0.18)";
      ctx!.lineWidth = 1;
      for (let x = 0; x <= W; x++) {
        const y = midY - amp * Math.abs(Math.cos(k * x));
        x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      }
      ctx!.stroke();
      ctx!.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = midY + amp * Math.abs(Math.cos(k * x));
        x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // standing wave (cyan solid)
      ctx!.beginPath();
      ctx!.strokeStyle = "#22d3ee";
      ctx!.lineWidth = 2.5;
      for (let x = 0; x <= W; x++) {
        const y = midY - amp * Math.cos(k * x) * Math.cos(omega * t);
        x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // nodes (zero crossings at W/4 and 3W/4)
      [W / 4, (3 * W) / 4].forEach(nx => {
        ctx!.beginPath();
        ctx!.arc(nx, midY, 5, 0, Math.PI * 2);
        ctx!.fillStyle = "#fbbf2488";
        ctx!.fill();
        ctx!.fillStyle = "#fbbf24";
        ctx!.font = "9px monospace";
        ctx!.textAlign = "center";
        ctx!.fillText("NODE", nx, midY + 18);
      });

      // ghost node antinode at centre (W/2)
      const cx = W / 2;
      const intensity = Math.abs(Math.cos(omega * t));
      const grad = ctx!.createRadialGradient(cx, midY, 0, cx, midY, 48);
      grad.addColorStop(0, `rgba(168,85,247,${intensity * 0.55})`);
      grad.addColorStop(1,  "rgba(168,85,247,0)");
      ctx!.beginPath();
      ctx!.arc(cx, midY, 48, 0, Math.PI * 2);
      ctx!.fillStyle = grad;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.setLineDash([3, 3]);
      ctx!.strokeStyle = `rgba(168,85,247,${0.35 + intensity * 0.4})`;
      ctx!.lineWidth = 1;
      ctx!.moveTo(cx, 0);
      ctx!.lineTo(cx, H);
      ctx!.stroke();
      ctx!.setLineDash([]);

      ctx!.textAlign = "center";
      ctx!.font = "bold 11px monospace";
      ctx!.fillStyle = "#a855f7";
      ctx!.fillText("Ψ(n=36) GHOST NODE", cx, 16);
      ctx!.font = "9px monospace";
      ctx!.fillStyle = "rgba(168,85,247,0.7)";
      ctx!.fillText(`${GHOST_MASS_U.toFixed(2)} u  ·  unoccupied`, cx, H - 8);

      // Tm dot (slightly left of antinode)
      const tmX = cx - 18;
      ctx!.beginPath();
      ctx!.arc(tmX, midY, 4, 0, Math.PI * 2);
      ctx!.fillStyle = "#34d399";
      ctx!.fill();
      ctx!.font = "9px monospace";
      ctx!.textAlign = "right";
      ctx!.fillStyle = "#34d399";
      ctx!.fillText(`Tm  n=${TM_N.toFixed(4)}`, tmX - 6, midY - 10);

      // legend
      const leg = [
        { color: "#3b82f6", label: "+k̂  forward beam" },
        { color: "#f87171", label: "−k̂  return beam"  },
        { color: "#22d3ee", label: "Ψ_trap  standing wave" },
      ];
      ctx!.textAlign = "left";
      ctx!.font = "10px monospace";
      leg.forEach(({ color, label }, i) => {
        const ly = H - 12 - i * 16;
        ctx!.fillStyle = color;
        ctx!.fillRect(8, ly - 7, 22, 2);
        ctx!.fillStyle = "rgba(148,163,184,0.75)";
        ctx!.fillText(label, 36, ly);
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
        height={210}
        className="w-full rounded-xl border border-slate-700 bg-slate-950"
        aria-label="Animated standing wave trap visualization"
      />
      <div className="flex justify-center">
        <button
          data-testid="button-standing-wave-pause"
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
export default function StandingWaveTrap() {
  usePageMeta({
    title: "The Trap — Standing Wave at the Ghost Node · NexusOS",
    description:
      "Act 7: Counter-propagating wave pairs (+k̂/−k̂) create a standing wave at the ghost node n=36 — an unoccupied WNSP address at 169.33 u. The first NexusOS operation to claim a spectral address nature left vacant. First disclosed 2026-07-07.",
    canonical: `${BASE}/standing-wave-trap`,
    ogTitle: "The Trap — Standing Wave at the Ghost Node",
    ogDescription:
      "n=36 is a valid WNSP address at 169.33 u. No element occupies it — nuclear binding energies skip over it. The standing wave trap holds it open. NexusOS Act 7.",
    twitterTitle: "The Trap — Ghost Node n=36",
    twitterDescription:
      "Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂) → |E|² → max at 169.33 u. No element exists here. The standing wave claims an address nature never filled. NexusOS Act 7.",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* sticky back bar */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur
                      border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link
            href="/element-catalogue"
            className="flex items-center gap-2 text-slate-400 hover:text-white
                       transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to The Catalogue
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* ── Header block ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* badges */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 7 of 8",              color: "#a855f7" },
              { label: `First Disclosure ${PAGE_DATE}`, color: "#22c55e" },
              { label: "AGPL-3.0",                color: "#8b5cf6" },
              { label: "N_Dir = 2",               color: "#06b6d4" },
              { label: "Ghost Node n=36",         color: "#f59e0b" },
            ].map(({ label, color }) => (
              <span key={label}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-full border"
                    style={{ color, borderColor: color + "55", background: color + "11" }}>
                {label}
              </span>
            ))}
          </div>

          {/* sequence nav */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <p className="text-[10px] font-mono text-purple-400 tracking-widest mb-3">
              THE SEQUENCE — ACT 7 OF 10
            </p>
            <div className="grid grid-cols-2 md:grid-cols-10 gap-2 text-center text-xs">
              {[
                { act:"ACT 1", title:"Theory of Compression States", sub:"Λ = hf/c²",         href:"/oscillating-quanta" },
                { act:"ACT 2", title:"The Universal ONE",            sub:"f₀ derives Λ",       href:"/universal-one" },
                { act:"ACT 3", title:"Unified Compression Theory",   sub:"4 forces = 1 Λ",     href:"/unified-compression-theory" },
                { act:"ACT 4", title:"The Mechanism",                sub:"ΔE = hf₀(2ⁿ²−2ⁿ¹)", href:"/matter-protocol" },
                { act:"ACT 5", title:"The Address",                  sub:"∀ Λ : ∃! Ψ",         href:"/universal-address" },
                { act:"ACT 6", title:"The Catalogue",                sub:"n = log₂(mc²/E₀)",   href:"/element-catalogue" },
              ].map(({ act, title, sub, href }) => (
                <Link key={href} href={href}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-3
                                 hover:border-slate-500 transition-colors space-y-1 block">
                  <p className="text-[9px] font-mono text-slate-500 tracking-widest">{act}</p>
                  <p className="text-slate-300 font-medium leading-tight">{title}</p>
                  <p className="text-[9px] text-slate-500">{sub}</p>
                </Link>
              ))}
              <div className="rounded-lg border border-purple-500/40 bg-purple-500/10
                              p-3 space-y-1">
                <p className="text-[9px] font-mono text-purple-400 tracking-widest">ACT 7 ← HERE</p>
                <p className="text-purple-200 font-medium leading-tight">The Trap</p>
                <p className="text-[9px] text-purple-400">Ψ(+k̂) ⊗ Ψ(−k̂)</p>
              </div>
              <Link href="/lossless-channel"
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/5
                               p-3 space-y-1 hover:border-emerald-400/60 transition-colors block">
                <p className="text-[9px] font-mono text-emerald-400 tracking-widest">ACT 8</p>
                <p className="text-emerald-200 font-medium leading-tight">The Channel</p>
                <p className="text-[9px] text-emerald-400">⊗ᵢ Ψ_trap(nᵢ)</p>
              </Link>
              <Link href="/resonance-cavity"
                    className="rounded-lg border border-indigo-500/30 bg-indigo-500/5
                               p-3 space-y-1 hover:border-indigo-400/60 transition-colors block">
                <p className="text-[9px] font-mono text-indigo-400 tracking-widest">ACT 9</p>
                <p className="text-indigo-200 font-medium leading-tight">The Cavity</p>
                <p className="text-[9px] text-indigo-400">WGM resonance, r_c</p>
              </Link>
              <Link href="/polariton-exchange"
                    className="rounded-lg border border-rose-500/30 bg-rose-500/5
                               p-3 space-y-1 hover:border-rose-400/60 transition-colors block">
                <p className="text-[9px] font-mono text-rose-400 tracking-widest">ACT 10</p>
                <p className="text-rose-200 font-medium leading-tight">The Exchange</p>
                <p className="text-[9px] text-rose-400">Ω_R = 2g</p>
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
              The Trap
            </h1>
            <p className="text-slate-400 text-base">
              A standing wave that claims an address nature never filled
            </p>
          </div>

          {/* abstract */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-2">
              ABSTRACT
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Act 6 revealed a ghost node: octave n=36 sits at 169.33 u — a valid
              coordinate in the WNSP compression lattice that no stable nucleus occupies.
              The gap exists because nuclear binding energy mass defects never produce
              that atomic mass. Thulium (Z=69, 4f¹³) approaches from below at
              n={TM_N.toFixed(4)} — only {TM_GAP.toFixed(4)} octaves short. The nearest
              stable Yb isotope above the ghost is Yb-170 at n={YB170_N.toFixed(4)} —
              only {(YB170_N - N_GHOST).toFixed(4)} oct above, giving a true nuclear
              gap of just {(TM_GAP + YB170_N - N_GHOST).toFixed(4)} octaves. The ghost
              node sits precisely at the threshold between the most incomplete and the
              first complete lanthanide shell. Act 7 shows how
              counter-propagating wave pairs (+k̂/−k̂) on the same Ψ channel create a
              standing wave whose antinode is positioned at n=36 — the first NexusOS
              operation that occupies a spectral address nature left permanently vacant.
            </p>
          </div>

          {/* key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Ghost node",     value: "n = 36",                  color: "#a855f7" },
              { label: "Ghost mass",     value: `${GHOST_MASS_U.toFixed(2)} u`,   color: "#f59e0b" },
              { label: "Tm gap",         value: `0.0034 octaves`,          color: "#22d3ee" },
              { label: "Lift ΔE",        value: `${DELTA_E_MEV.toFixed(0)} MeV`, color: "#34d399" },
            ].map(({ label, value, color }) => (
              <div key={label}
                   className="rounded-lg border bg-slate-900/60 p-4 text-center space-y-1"
                   style={{ borderColor: color + "33" }}>
                <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
                <p className="text-[10px] text-slate-400 font-mono">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── S1: The Ghost Node ──────────────────────────────────────────── */}
        <Section id="ghost-node" title="1. The Ghost Node"
                 icon={Circle} color="#a855f7" badge="n=36 Unoccupied">
          <p className="text-sm text-slate-300 leading-relaxed">
            The octave lattice assigns a coordinate n = log₂(mc²/E₀) to every mass.
            Integer values of n are special — they are equilibrium positions,
            the nodes where the standing wave of the universe comes to rest. Noble gases
            occupy integer nodes. But n=36 at {GHOST_MASS_U.toFixed(4)} u has no
            occupant. The nuclear strong force, which determines atomic mass via
            binding energy, simply never builds a stable nucleus at that mass.
            n=36 is a <strong className="text-white">ghost node</strong> — present in
            the lattice, absent in matter.
          </p>
          <div className="overflow-x-auto rounded-xl border border-purple-500/20">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-purple-500/8 border-b border-purple-500/20">
                  <th className="text-left   px-4 py-2.5 text-purple-400">Element</th>
                  <th className="text-center px-4 py-2.5 text-purple-400">Z</th>
                  <th className="text-left   px-4 py-2.5 text-purple-400">Shell</th>
                  <th className="text-right  px-4 py-2.5 text-purple-400">Mass (u)</th>
                  <th className="text-right  px-4 py-2.5 text-purple-400">Octave n</th>
                  <th className="text-right  px-4 py-2.5 text-purple-400">Δ to n=36</th>
                  <th className="text-left   px-4 py-2.5 text-purple-400">Role</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    sym: "Kr", name: "Krypton",   Z: 36,
                    shell: "[Ar] 3d¹⁰ 4p⁶", mass: KR_MASS_U,
                    n: KR_N, role: "Floor — noble gas node",
                    roleColor: "#fbbf24",
                  },
                  {
                    sym: "Tm", name: "Thulium",   Z: 69,
                    shell: "[Xe] 4f¹³ 6s²", mass: TM_MASS_U,
                    n: TM_N, role: "Ceiling — 4f¹³ incomplete",
                    roleColor: "#22d3ee",
                  },
                  {
                    sym: "—",  name: "Ghost Node", Z: 0,
                    shell: "(4f¹⁴ hypothetical)", mass: GHOST_MASS_U,
                    n: N_GHOST, role: "Unoccupied WNSP address",
                    roleColor: "#a855f7",
                  },
                  {
                    sym: "Yb", name: "Ytterbium", Z: 70,
                    shell: "[Xe] 4f¹⁴ 6s²", mass: YB_MASS_U,
                    n: YB_N, role: "First element past ghost",
                    roleColor: "#f87171",
                  },
                ].map(row => {
                  const isGhost = row.Z === 0;
                  const delta   = N_GHOST - row.n;
                  return (
                    <tr key={row.sym}
                        className={`border-b border-purple-500/10
                          ${isGhost ? "bg-purple-500/10" : ""}`}>
                      <td className="px-4 py-2.5">
                        <span className="font-bold"
                              style={{ color: row.roleColor }}>{row.sym}</span>
                        <span className="text-slate-400 ml-2">{row.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-400">
                        {row.Z > 0 ? row.Z : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{row.shell}</td>
                      <td className="px-4 py-2.5 text-right text-slate-300">
                        {row.mass.toFixed(3)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-white font-bold">
                        {isGhost ? "36.0000" : fmt4(row.n)}
                      </td>
                      <td className="px-4 py-2.5 text-right"
                          style={{ color: row.roleColor }}>
                        {isGhost ? "—" :
                          delta > 0
                            ? `−${Math.abs(delta).toFixed(4)}`
                            : `+${Math.abs(delta).toFixed(4)}`}
                      </td>
                      <td className="px-4 py-2.5"
                          style={{ color: row.roleColor }}>{row.role}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Eq>{"Ghost node: n=36  →  mass = (E₀ × 2³⁶) / (931,494,000 eV/u)  =  " + GHOST_MASS_U.toFixed(4) + " u"}</Eq>
        </Section>

        {/* ── S2: The Standing Wave ───────────────────────────────────────── */}
        <Section id="standing-wave" title="2. The Standing Wave"
                 icon={Waves} color="#22d3ee" badge="Ψ(+k̂) ⊗ Ψ(−k̂)">
          <p className="text-sm text-slate-300 leading-relaxed">
            Two coherent beams at the same frequency, propagating in opposite directions
            on the same Ψ channel, superpose to produce a standing wave. The spatial
            structure is frozen — antinodes (maximum |E|²) sit at fixed coordinates.
            Positioning the antinode at the ghost node address delivers ΔE coherently
            at one point in space with no thermal spread.
          </p>

          {/* derivation */}
          <div className="space-y-3">
            {[
              { label: "+k̂ forward beam", eq: "E₊ = E₀ cos(kx − ωt)", color: "#3b82f6" },
              { label: "−k̂ return beam",  eq: "E₋ = E₀ cos(kx + ωt)", color: "#f87171" },
              { label: "Superposition",    eq: "E₊ + E₋ = 2E₀ cos(kx) · cos(ωt)", color: "#22d3ee" },
              { label: "Energy density",   eq: "|E|² → max  at  cos(kx) = ±1  →  kx = 0, π, 2π, …", color: "#a855f7" },
            ].map(({ label, eq, color }) => (
              <div key={label}
                   className="rounded-lg border p-4 flex flex-col sm:flex-row
                              sm:items-center gap-3"
                   style={{ borderColor: color + "33", background: color + "08" }}>
                <span className="text-[10px] font-mono font-bold flex-shrink-0 w-36"
                      style={{ color }}>{label}</span>
                <code className="font-mono text-sm text-white">{eq}</code>
              </div>
            ))}
          </div>

          <StandingWaveViz />

          <div className="rounded-xl border border-purple-500/25
                          bg-gradient-to-br from-purple-500/10 to-slate-900/60 p-5 space-y-2">
            <p className="text-[10px] font-mono text-purple-400 tracking-widest">
              TRAP EQUATION — FIRST DISCLOSED {PAGE_DATE}
            </p>
            <p className="font-mono text-lg text-white text-center">
              Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂)  →  |E|² → max at (x₀, y₀, z₀)
            </p>
            <p className="text-xs text-slate-400 text-center">
              where (x₀, y₀, z₀) is the spatial coordinate of ghost node Ψ(n=36)
            </p>
          </div>
        </Section>

        {/* ── S3: The Binding Energy Mass Defect ─────────────────────────── */}
        <Section id="mass-defect" title="3. The Binding Energy Mass Defect"
                 icon={Atom} color="#f59e0b" badge="Why the void exists">
          <p className="text-sm text-slate-300 leading-relaxed">
            Every nucleus is lighter than the sum of its free constituent protons and
            neutrons. The difference is the{" "}
            <span className="text-amber-300 font-semibold">mass defect</span> (Δm) —
            the mass converted to binding energy when the nucleus formed:
          </p>
          <Eq>{"Δm = Z·mₚ + N·mₙ − M_nucleus        E_b = Δm · c²"}</Eq>
          <p className="text-sm text-slate-300 leading-relaxed">
            The binding energies of all nuclei near Z=69 produce masses that skip over
            169.33 u. No combination of protons and neutrons satisfies
            M_nucleus ≈ {GHOST_MASS_U.toFixed(2)} u with sufficient binding to be
            stable. The ghost node is a{" "}
            <span className="text-white font-semibold">binding energy gap</span> —
            a mass the strong nuclear force refuses to produce.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Thulium-169",
                sym: "Tm",
                color: "#22d3ee",
                lines: [
                  "69 protons, 100 neutrons",
                  "Shell: [Xe] 4f¹³ 6s²",
                  "4f shell: 13/14 filled",
                  `Mass: ${TM_MASS_U} u`,
                  `n = ${fmt4(TM_N)}`,
                  `Gap: −${TM_GAP.toFixed(4)} oct`,
                  "Only stable Tm isotope",
                ],
              },
              {
                title: "Ghost Node  n=36",
                sym: "∅",
                color: "#a855f7",
                lines: [
                  "No stable nucleus",
                  "No unstable nucleus*",
                  "Mass: " + GHOST_MASS_U.toFixed(3) + " u",
                  "Binding energy gap",
                  "Valid WNSP address",
                  "WDM = " + GHOST_WDM + " (SYSTEM band)",
                  "*No isotope of any Z",
                ],
              },
              {
                title: "Ytterbium-174",
                sym: "Yb",
                color: "#f87171",
                lines: [
                  "70 protons, 104 neutrons",
                  "Shell: [Xe] 4f¹⁴ 6s²",
                  "4f shell: 14/14 filled ✓",
                  `Mass: ${YB_MASS_U} u`,
                  `n = ${fmt4(YB_N)}`,
                  `Gap: +${(YB_N - N_GHOST).toFixed(4)} oct`,
                  "First complete lanthanide",
                ],
              },
            ].map(({ title, sym, color, lines }) => (
              <div key={title}
                   className="rounded-xl border p-5 space-y-3"
                   style={{ borderColor: color + "33", background: color + "08" }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono"
                        style={{ color }}>{sym}</span>
                  <span className="text-white font-semibold text-sm">{title}</span>
                </div>
                <ul className="space-y-1">
                  {lines.map(l => (
                    <li key={l} className="text-xs font-mono text-slate-400">
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-500/25
                          bg-amber-500/5 p-4 space-y-2">
            <p className="text-[10px] font-mono text-amber-400 tracking-widest">
              THE THRESHOLD
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              The ghost node sits precisely between the{" "}
              <span className="text-cyan-300">most incomplete</span> (Tm, 4f¹³) and
              the <span className="text-red-300">first complete</span> (Yb, 4f¹⁴)
              lanthanide shell. The void is the threshold between incompleteness
              and completion. The trap asks nature a question it cannot answer
              with matter.
            </p>
            <div className="font-mono text-xs text-center text-slate-400 pt-1">
              Kr (floor, n=34.985) → … →{" "}
              <span className="text-cyan-300">{`Tm 4f¹³ (n=${TM_N.toFixed(4)})`}</span> →{" "}
              <span className="text-purple-300 font-bold">[n=36 void]</span> →{" "}
              <span className="text-red-300">{`Yb-170 (n=${YB170_N.toFixed(4)}, nearest nuclear boundary)`}</span>
            </div>
          </div>
        </Section>

        {/* ── S4: The WNSP Ghost Address ──────────────────────────────────── */}
        <Section id="ghost-address" title="4. The WNSP Ghost Address"
                 icon={Radio} color="#06b6d4" badge="Unclaimed Ψ channel">
          <p className="text-sm text-slate-300 leading-relaxed">
            In the WNSP addressing system, every mass-energy state maps to a unique
            Ψ(WDM, OAM, Pol, Dir) coordinate. n=36 is a fully valid Ψ address —
            the lattice contains it. But no atom has ever claimed it. It is the
            longest-standing unclaimed address in the known matter spectrum.
          </p>
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-5 space-y-4">
            <p className="text-[10px] font-mono text-cyan-400 tracking-widest">
              GHOST ADDRESS DERIVATION
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              {[
                { label: "Octave",        value: "n = 36",          color: "#a855f7" },
                { label: "WDM channel",   value: `frac(36) × 255 = ${GHOST_WDM}  →  SYSTEM band`,  color: "#8b00ff" },
                { label: "OAM mode",      value: "36 mod 50 = 36",   color: "#22d3ee" },
                { label: "Polarisation",  value: "H (by convention)", color: "#22d3ee" },
                { label: "Direction",     value: "+k̂ ⊗ −k̂  (N_Dir=2, both active)", color: "#06b6d4" },
                { label: "Full address",  value: "Ψ(WDM=0, OAM=36, Pol=H, Dir=±k̂)", color: "#f59e0b" },
                { label: "Status",        value: "UNOCCUPIED — no nucleus, balance 0, owner none", color: "#f87171" },
                { label: "First claimed", value: "when the trap standing wave is sustained", color: "#34d399" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex gap-3 items-start">
                  <span className="text-slate-500 flex-shrink-0 w-28">{label}</span>
                  <span style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-purple-500/25
                          bg-gradient-to-br from-purple-500/10 to-slate-900/60 p-5">
            <p className="text-[10px] font-mono text-purple-400 tracking-widest mb-3">
              KEY INSIGHT — N_Dir=2
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              The 51,200 WNSP channels (256 WDM × 50 OAM × 2 Pol × 2 Dir) already
              encode N_Dir=2 — both +k̂ and −k̂ as orthogonal Hilbert sub-spaces.
              Every Ψ channel has a built-in forward/return pair. The trap requires
              no new hardware, no new addressing. Activating both directions of
              Ψ(WDM=0, OAM=36, Pol=H) simultaneously <em>is</em> the trap.
            </p>
            <Eq>{"N_total = 256 × 50 × 2 × 2 = 51,200  (N_Dir=2 first disclosed 2026-07-02)"}</Eq>
          </div>
        </Section>

        {/* ── S5: 4-Step Protocol ─────────────────────────────────────────── */}
        <Section id="protocol" title="5. 4-Step Instrument Protocol"
                 icon={Target} color="#34d399" badge="Extending Act 6 Step 3">
          <p className="text-sm text-slate-300 leading-relaxed">
            Act 6 defined a 3-step protocol for any element. Act 7 extends it with
            Step 4 — the trap configuration. For any target element, Steps 1–3
            remain identical. Step 4 activates both propagation directions
            simultaneously to produce the standing wave.
          </p>
          <div className="space-y-3">
            {[
              {
                step: "STEP 1", color: "#22c55e",
                title: "Calculate the Octave Address",
                body: "Obtain the element's standard atomic weight in u from IUPAC. Apply n = log₂(mass_u × 931,494,000 / 2.295). This gives the exact octave coordinate. For the ghost node: n = 36, mass = " + GHOST_MASS_U.toFixed(3) + " u.",
                eq: "n = log₂(m_u × 931,494,000 / 2.295)",
              },
              {
                step: "STEP 2", color: "#f59e0b",
                title: "Calculate ΔE",
                body: "The energy to shift by one octave from n is E₀ × 2ⁿ. For the ghost node the ΔE from Tm is the energy of the mass defect gap: " + DELTA_E_MEV.toFixed(1) + " MeV — nuclear scale, not optical.",
                eq: `ΔE_gap = mc² × (2^${TM_GAP.toFixed(4)} − 1) ≈ ${DELTA_E_MEV.toFixed(0)} MeV`,
              },
              {
                step: "STEP 3", color: "#06b6d4",
                title: "Configure the Ψ Channel",
                body: "Map to WNSP channels. WDM = frac(n) × 255. OAM = Z mod 50. Select polarisation. For the ghost node: WDM=" + GHOST_WDM + ", OAM=36, Pol=H — SYSTEM band, channel 0.",
                eq: "Ψ = (WDM: " + GHOST_WDM + ", OAM: 36, Pol: H)",
              },
              {
                step: "STEP 4", color: "#a855f7",
                title: "Activate Both Directions — The Trap",
                body: "Activate +k̂ and −k̂ simultaneously on the same Ψ channel. The two coherent beams superpose to create a standing wave: E₊ + E₋ = 2E₀cos(kx)cos(ωt). Position the antinode at the target's spatial coordinate. |E|² is maximum there — energy is delivered coherently with no thermal spread.",
                eq: "Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂)  →  |E|² → max at (x₀, y₀, z₀)",
              },
            ].map(({ step, color, title, body, eq }) => (
              <div key={step}
                   className="rounded-xl border p-5 space-y-3"
                   style={{ borderColor: color + "33", background: color + "08" }}>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5
                                   rounded-full border"
                        style={{ color, borderColor: color + "66",
                                 background: color + "18" }}>
                    {step}
                  </span>
                  <h3 className="text-sm font-bold text-white">{title}</h3>
                  {step === "STEP 4" && (
                    <span className="text-[9px] font-mono text-purple-400 border
                                     border-purple-500/40 px-1.5 py-0.5 rounded-full">
                      NEW IN ACT 7
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
                <div className="bg-black/30 border border-slate-700/50 rounded-lg
                                px-4 py-2.5 font-mono text-sm text-center"
                     style={{ color }}>
                  {eq}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── S6: The Full Sequence ────────────────────────────────────────── */}
        <Section id="sequence" title="6. The Sequence — Acts 1–7 Complete"
                 icon={GitMerge} color="#f59e0b" badge="Complete">
          <div className="rounded-xl border border-amber-500/25
                          bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 space-y-4">
            <div className="space-y-3 font-mono text-xs">
              {[
                { act:"ACT 1", href:"/oscillating-quanta",         title:"Theory of Compression States", eq:"Λ = hf/c²",           body:"The governing equation. Matter, energy, and mass are all compression states of electromagnetic frequency." },
                { act:"ACT 2", href:"/universal-one",              title:"The Universal ONE",             eq:"f₀ derives Λ  (∎)",   body:"Λ follows from combining Planck (1900) and Einstein (1905) at the first oscillation f₀ = 555 THz." },
                { act:"ACT 3", href:"/unified-compression-theory", title:"Unified Compression Theory",   eq:"4 forces = 1 Λ",      body:"All four fundamental forces are one phenomenon — four expressions of Λ across nine octave tiers." },
                { act:"ACT 4", href:"/matter-protocol",            title:"The Mechanism",                eq:"ΔE = hf₀(2ⁿ²−2ⁿ¹)",  body:"Matter manipulation = delivering ΔE at the exact transition frequency via WNSP Ψ channel." },
                { act:"ACT 5", href:"/universal-address",          title:"The Address",                  eq:"∀ Λ : ∃! Ψ  (∎)",    body:"Every compression state has a unique Ψ address derived from physics. The universe's own namespace." },
                { act:"ACT 6", href:"/element-catalogue",          title:"The Catalogue",                eq:"n = log₂(mc²/E₀)",   body:"All 118 elements mapped to octave integers. Noble gas equilibrium nodes. Kr→Tm ceiling pair." },
                { act:"ACT 7", href:"/standing-wave-trap",         title:"The Trap",                     eq:"Ψ(+k̂) ⊗ Ψ(−k̂)  (∎)", body:"Counter-propagating beams create a standing wave at the ghost node n=36 — the first claim on an address nature left vacant." },
              ].map(({ act, href, title, eq, body }) => {
                const isThis = href === "/standing-wave-trap";
                return (
                  <div key={act}
                       className={`flex gap-4 items-start border-b border-slate-800/60
                                   pb-3 last:border-0 last:pb-0
                                   ${isThis ? "bg-purple-500/5 -mx-2 px-2 rounded-lg" : ""}`}>
                    <span className={`font-bold flex-shrink-0 w-12
                      ${isThis ? "text-purple-400" : "text-amber-400"}`}>
                      {act}
                    </span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <p className="text-white font-bold">{title}</p>
                        <p className={isThis ? "text-purple-300/70" : "text-amber-300/70"}>
                          {eq}
                        </p>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{body}</p>
                      <Link href={href}
                            className={`text-[10px] inline-flex items-center gap-1 mt-1
                              ${isThis
                                ? "text-purple-500 hover:text-purple-400"
                                : "text-emerald-500 hover:text-emerald-400"}`}>
                        {BASE}{href} <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Eq>{"∀ ghost node G : ∃! Ψ(G)  ∧  ∄ nucleus(G)  ∧  Ψ_trap(G) = Ψ(+k̂) ⊗ Ψ(−k̂)  ∧  |E|²(G) → max  (∎)"}</Eq>
        </Section>

        {/* ── S7: Conclusion ──────────────────────────────────────────────── */}
        <Section id="conclusion" title="7. Conclusion" icon={Lock} color="#94a3b8">
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              The universe built 118 elements and left one address permanently empty.
              n=36 at 169.33 u exists in the WNSP compression lattice — assigned by
              physics, reachable by address, owned by nothing. The strong nuclear force
              cannot build a nucleus there. No binding energy mass defect resolves to
              that mass. The ghost node has been vacant since the first oscillation.
            </p>
            <p>
              The standing wave trap is not a manipulation of matter. It is the first
              assertion of spectral presence at an address that predates every atom.
              Two counter-propagating beams on the same Ψ channel. Constructive
              interference at one coordinate. |E|² maximum at (x₀, y₀, z₀). No nucleus
              required. The channel speaks for itself.
            </p>
            <p>
              Acts 1–7 of 8 are complete here. The theory derives from the first oscillation
              (Act 1), identifies the ground state (Act 2), unifies the forces (Act 3),
              provides the mechanism (Act 4), establishes the namespace (Act 5),
              catalogues all known matter (Act 6), and demonstrates occupation of the
              void (Act 7). Act 8 extends the trap into a lossless propagation channel.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Acts in sequence",   value: "8",                  color: "#a855f7" },
              { label: "Ghost node mass",    value: `${GHOST_MASS_U.toFixed(2)} u`, color: "#f59e0b" },
              { label: "Ψ channels (total)", value: "51,200",             color: "#22d3ee" },
              { label: "First claimed",      value: "2026-07-07",         color: "#34d399" },
            ].map(({ label, value, color }) => (
              <div key={label}
                   className="rounded-lg border border-slate-700 bg-slate-900/60
                              p-4 text-center space-y-1">
                <p className="text-2xl font-bold text-white font-mono"
                   style={{ color }}>{value}</p>
                <p className="text-[10px] text-slate-400 font-mono">{label}</p>
              </div>
            ))}
          </div>

          {/* photonic future callout */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-2">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">
              PHOTONIC COMPUTING — 2032
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              In photonic ASICs, the standing wave trap is a literal optical cavity
              resonator tuned to the ghost node frequency f₃₆ = f₀ × 2³⁶. No software
              emulation. The Ψ(WDM=0, OAM=36, Pol=H) channel maps directly to a
              physical waveguide lane. Activating both propagation directions is a
              hardware instruction — one signal, two directions, one standing wave.
              NexusOS is already written in the language of that hardware.
            </p>
          </div>

          {/* Act 8 teaser */}
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5
                          p-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-emerald-400 tracking-widest
                               border border-emerald-500/40 px-2 py-0.5 rounded-full">
                ACT 8 — NOW LIVE
              </span>
              <span className="text-white font-bold text-sm">The Lossless Channel</span>
            </div>
            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              The trap holds energy at one ghost node. Act 8 moves it. A chain of ghost
              node traps forms a waveguide with α=0 — no matter to scatter from.
              Shannon capacity reaches the vacuum zero-point floor ½ℏω. 15 academic
              references. First disclosed 2026-07-07.
            </p>
            <p className="text-[10px] font-mono text-emerald-400">
              Eq: Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)  ·  α = 0  ·  L = 0
            </p>
            <Link href="/lossless-channel"
                  className="inline-flex items-center gap-1.5 text-xs font-mono
                             text-emerald-400 hover:text-emerald-300 transition-colors
                             border border-emerald-500/30 hover:border-emerald-400/50
                             px-3 py-1.5 rounded-lg bg-emerald-500/10 mt-1">
              Read Act 8 — The Lossless Channel
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </Section>

        <EcosystemNav />

      </div>
    </div>
  );
}
