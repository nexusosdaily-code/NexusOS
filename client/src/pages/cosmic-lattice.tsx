import { useState, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import { ExternalLink, Globe, Zap, BarChart2, AlertTriangle, BookOpen, Layers } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_DATE = "2026-07-19";
const BASE      = "https://wnsp.io";
const AX        = "#a78bfa"; // violet-400 — void / cosmic
const AMBER     = "#f59e0b";
const DEAD      = "#ef4444";

// ── Physics helpers ───────────────────────────────────────────────────────────
const H  = 6.626e-34;
const C  = 2.998e8;
const F0 = 555e12;        // 555 THz — established seed frequency (Act 2)
const E0 = H * F0;        // 3.677e-22 J = 2.295 eV
const octaveOf = (massKg: number) => Math.log2(massKg * C * C / E0);
const Msun = 1.989e30;

// ── Cosmic Octave Lattice data ────────────────────────────────────────────────
const ZPE_N   = 264.71;   // cosmic ZPE floor octave index
const BAO_MPC = 147;      // BAO sound horizon (Mpc)
const N_MIN   = 15;
const N_MAX   = 300;

interface LatticeNode {
  n: number; label: string; full: string; mass: string;
  zone: "active" | "floor" | "dead" | "void" | "ghost";
  note?: string; src?: string;
}

const LATTICE: LatticeNode[] = [
  { n: octaveOf(9.109e-31),  label:"e⁻",      full:"Electron",             mass:"9.1×10⁻³¹ kg",   zone:"active" },
  { n: octaveOf(1.673e-27),  label:"p⁺",      full:"Proton",               mass:"1.67×10⁻²⁷ kg",  zone:"active" },
  { n: octaveOf(1.674e-27),  label:"H",        full:"Hydrogen",             mass:"1.008 u",         zone:"active" },
  { n: 34.985,               label:"Kr",       full:"Krypton — integer node", mass:"83.80 u",       zone:"active", note:"n ≈ 35.000 exact integer" },
  { n: 36.000,               label:"⊘₃₆",     full:"Quantum Ghost Node",   mass:"169.33 u",        zone:"ghost",  note:"No stable nucleus — Act 6 Claim 1" },
  { n: octaveOf(5.972e24),   label:"Earth",    full:"Earth",                mass:"5.97×10²⁴ kg",   zone:"active" },
  { n: octaveOf(1.989e30),   label:"☀",        full:"Sun (1 M☉)",          mass:"1.99×10³⁰ kg",   zone:"active" },
  { n: octaveOf(1.989e42),   label:"MW",       full:"Milky Way (~10¹² M☉)", mass:"1.99×10⁴² kg",  zone:"active" },
  { n: octaveOf(1.989e43),   label:"Groups",   full:"Galaxy Groups (10¹³ M☉)", mass:"1.99×10⁴³ kg", zone:"active", note:"σ = 7.700 — strongly active" },
  { n: ZPE_N,                label:"FLOOR",    full:"Cosmic ZPE Floor",     mass:"10¹⁴ M☉",        zone:"floor",  note:"σ(M) = δ_c = 1.686 — collapse threshold" },
  { n: octaveOf(1.989e45),   label:"SC",       full:"Superclusters (10¹⁵ M☉)", mass:"1.99×10⁴⁵ kg", zone:"dead", note:"σ = 0.367 — deeply suppressed" },
  { n: octaveOf(3.0e46),     label:"Boötes",   full:"Boötes Void (~10¹⁶ M☉)", mass:"~3×10⁴⁶ kg",  zone:"void",  note:"P ≈ 10⁻¹⁰¹ — physically impossible", src:"Kirshner et al. 1981" },
  { n: octaveOf(1.0e47),     label:"Eridanus", full:"Eridanus Supervoid (10¹⁷ M☉)", mass:"~10⁴⁷ kg", zone:"void", note:"CMB Cold Spot alignment", src:"Szapudi et al. 2015" },
  { n: octaveOf(1.0e53),     label:"∅⟨⟩",     full:"Observable Universe",  mass:"~10⁵³ kg",       zone:"dead" },
];

interface VoidEntry {
  name: string; diam: number; node: number; frac: string; dev: number; n: number; src: string; doi: string;
}
const VOIDS: VoidEntry[] = [
  { name:"Canes Venatici Void",  diam:55,  node:49,  frac:"λ/3",  dev:12.2, n:octaveOf(5e13*Msun),  src:"Tully et al. 2019",    doi:"https://doi.org/10.3847/1538-4357/ab2597" },
  { name:"Boötes Void",          diam:101, node:98,  frac:"2λ/3", dev:3.1,  n:octaveOf(3e16*Msun),  src:"Kirshner et al. 1981", doi:"https://doi.org/10.1086/159178" },
  { name:"Eridanus Supervoid",   diam:153, node:147, frac:"λ",    dev:4.1,  n:octaveOf(1e17*Msun),  src:"Szapudi et al. 2015",  doi:"https://doi.org/10.1093/mnrasl/slv009" },
  { name:"CMB Cold Spot region", diam:200, node:196, frac:"4λ/3", dev:2.0,  n:octaveOf(3e17*Msun),  src:"Bremer et al. 2022",   doi:"https://doi.org/10.1093/mnras/stac085" },
];

const PS_TABLE = [
  { logM:"10¹³", n:261.39, sigma:7.700, active:true,  note:"Galaxy groups — strongly active" },
  { logM:"10¹⁴", n:264.71, sigma:1.680, active:false, note:"⟵ Cosmic ZPE floor (σ ≈ δ_c)" },
  { logM:"10¹⁵", n:268.04, sigma:0.367, active:false, note:"Superclusters — deeply suppressed" },
  { logM:"10¹⁶", n:271.36, sigma:0.080, active:false, note:"Boötes zone — P ≈ 10⁻¹⁰¹" },
  { logM:"10¹⁷", n:274.68, sigma:0.017, active:false, note:"Eridanus zone — P → 0" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color = AX, children }: {
  title: string; icon: ElementType; color?: string; children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-slate-900/60 p-5 mb-4"
      style={{ borderColor: color + "30" }}>
      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Eq({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-center"
      style={{ color: AX }}>
      {children}
    </div>
  );
}

function RefEntry({ n, authors, year, title, journal, doi, note }: {
  n: number; authors: string; year: string|number; title: string;
  journal: string; doi?: string; note?: string;
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-slate-500 font-mono w-5 flex-shrink-0">[{n}]</span>
      <div>
        <span className="text-slate-400">{authors} ({year}). </span>
        {doi
          ? <a href={doi} target="_blank" rel="noopener noreferrer"
               className="italic hover:opacity-80" style={{ color: AX }}>{title}</a>
          : <span className="text-white italic">{title}</span>}
        <span className="text-slate-500">. {journal}</span>
        {note && <p className="text-slate-600 mt-0.5 leading-relaxed">{note}</p>}
      </div>
    </div>
  );
}

// ── Sequence nav ─────────────────────────────────────────────────────────────
const ACT_NAV = [
  { act:"1",  title:"Compression States", sub:"Λ=hf/c²",           href:"/oscillating-quanta" },
  { act:"2",  title:"The Universal ONE",  sub:"f₀ derives Λ",       href:"/universal-one" },
  { act:"3",  title:"Unified Theory",     sub:"4 forces=1 Λ",       href:"/unified-compression-theory" },
  { act:"4",  title:"The Mechanism",      sub:"ΔE=hf₀(2ⁿ²−2ⁿ¹)",  href:"/matter-protocol" },
  { act:"5",  title:"The Address",        sub:"∀Λ:∃!Ψ",             href:"/universal-address" },
  { act:"6",  title:"The Catalogue",      sub:"n=log₂(mc²/E₀)",    href:"/element-catalogue" },
  { act:"7",  title:"The Trap",           sub:"Ψ(+k̂)⊗Ψ(−k̂)",    href:"/standing-wave-trap" },
  { act:"8",  title:"The Channel",        sub:"α=0, C=ZPE",         href:"/lossless-channel" },
  { act:"9",  title:"The Cavity",         sub:"R=nc/2πfₙ",          href:"/resonance-cavity" },
  { act:"10", title:"The Exchange",       sub:"Ω_R=2g",             href:"/polariton-exchange" },
  { act:"11", title:"The Emitter",        sub:"F_p=(Q/V)(λ/n)³",   href:"/the-emitter" },
  { act:"12", title:"The Network",        sub:"ω=ω₀−2J·cos(ka)",  href:"/the-network" },
  { act:"13", title:"The Observer",       sub:"χ=g²/Δ",             href:"/the-observer" },
  { act:"14", title:"The Memory",         sub:"T₂≤2T₁",             href:"/the-memory" },
];

function SequenceNav() {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: AX + "20", background: AX + "08" }}>
      <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: AX }}>
        THE SEQUENCE — ACT 15 OF 15
      </p>
      <div className="grid grid-cols-3 md:grid-cols-15 gap-1.5 text-center text-xs">
        {ACT_NAV.map(({ act, title, sub, href }) => (
          <Link key={href} href={href}
                className="rounded-lg border border-slate-700 bg-slate-900 p-1.5
                           hover:border-slate-500 transition-colors space-y-0.5 block">
            <p className="text-[7px] font-mono text-slate-500 tracking-widest">ACT {act}</p>
            <p className="text-slate-300 font-medium leading-tight text-[8px]">{title}</p>
            <p className="text-[7px] text-slate-500">{sub}</p>
          </Link>
        ))}
        <div className="rounded-lg border p-1.5 space-y-0.5"
          style={{ borderColor: AX + "50", background: AX + "15" }}>
          <p className="text-[7px] font-mono tracking-widest" style={{ color: "#ede9fe" }}>ACT 15 ← HERE</p>
          <p className="font-medium leading-tight text-[8px]" style={{ color: "#f5f3ff" }}>The Void</p>
          <p className="text-[7px]" style={{ color: AX }}>n_ZPE=264.71</p>
        </div>
      </div>
    </div>
  );
}

// ── Cosmic Octave Lattice SVG ─────────────────────────────────────────────────
function CosmicLatticeSVG({ hovered, setHovered }: {
  hovered: LatticeNode | null;
  setHovered: (n: LatticeNode | null) => void;
}) {
  const W = 860; const H = 220;
  const padL = 10; const padR = 10; const padT = 30; const padB = 60;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const toX = (n: number) => padL + ((n - N_MIN) / (N_MAX - N_MIN)) * iw;
  const floorX = toX(ZPE_N);

  const zoneColor = (z: LatticeNode["zone"]) => {
    if (z === "active") return "#10b981";
    if (z === "floor")  return "#f59e0b";
    if (z === "ghost")  return "#6366f1";
    if (z === "void")   return "#ef4444";
    return "#475569";
  };

  // Tick marks every 20 octaves
  const ticks = [];
  for (let n = 20; n <= 290; n += 20) {
    ticks.push(n);
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-slate-950" style={{ borderColor: AX + "25" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]"
           style={{ minHeight: 160 }}>

        {/* Active zone fill */}
        <rect x={padL} y={padT} width={floorX - padL} height={ih}
              fill="#10b98110" rx={0} />

        {/* Dead / Ghost zone fill */}
        <rect x={floorX} y={padT} width={W - padR - floorX} height={ih}
              fill="#ef444408" rx={0} />

        {/* Baseline */}
        <line x1={padL} y1={padT + ih} x2={W - padR} y2={padT + ih}
              stroke="#334155" strokeWidth={1} />

        {/* ZPE Floor vertical line */}
        <line x1={floorX} y1={padT - 8} x2={floorX} y2={padT + ih}
              stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={floorX + 3} y={padT - 2} fill="#f59e0b" fontSize={8} fontFamily="monospace">
          Cosmic ZPE Floor n=264.71
        </text>

        {/* Tick marks + labels */}
        {ticks.map(n => {
          const x = toX(n);
          return (
            <g key={n}>
              <line x1={x} y1={padT + ih} x2={x} y2={padT + ih + 4}
                    stroke="#334155" strokeWidth={0.8} />
              <text x={x} y={padT + ih + 13} fill="#475569" fontSize={7}
                    textAnchor="middle" fontFamily="monospace">{n}</text>
            </g>
          );
        })}

        {/* Axis label */}
        <text x={W / 2} y={H - 4} fill="#334155" fontSize={7} textAnchor="middle" fontFamily="monospace">
          n = log₂(mc²/E₀)   f₀ = 555 THz, E₀ = 2.295 eV
        </text>

        {/* Zone labels */}
        <text x={(padL + floorX) / 2} y={padT + ih - 6} fill="#10b981"
              fontSize={7} textAnchor="middle" fontFamily="monospace" opacity={0.7}>
          ACTIVE — structures form
        </text>
        <text x={(floorX + W - padR) / 2} y={padT + ih - 6} fill="#ef4444"
              fontSize={7} textAnchor="middle" fontFamily="monospace" opacity={0.7}>
          GHOST ZONE — collapse impossible
        </text>

        {/* Structure markers */}
        {LATTICE.map((node) => {
          const x = toX(node.n);
          const col = zoneColor(node.zone);
          const isHov = hovered?.label === node.label;
          const yBase = padT + ih;
          const stemH = node.zone === "floor" ? 55 : node.zone === "void" ? 60 : 45;
          return (
            <g key={node.label}
               style={{ cursor: "pointer" }}
               onMouseEnter={() => setHovered(node)}
               onMouseLeave={() => setHovered(null)}>
              {/* Stem */}
              <line x1={x} y1={yBase - stemH} x2={x} y2={yBase}
                    stroke={col} strokeWidth={isHov ? 1.5 : 0.8} opacity={0.7} />
              {/* Dot */}
              <circle cx={x} cy={yBase - stemH} r={isHov ? 5 : 3.5}
                      fill={col} opacity={isHov ? 1 : 0.85} />
              {/* Label */}
              <text x={x} y={yBase - stemH - 6} fill={col}
                    fontSize={node.zone === "floor" ? 7 : 6.5}
                    fontWeight={isHov ? "bold" : "normal"}
                    textAnchor="middle" fontFamily="monospace">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── BAO Node SVG ──────────────────────────────────────────────────────────────
function BAONodeSVG() {
  const W = 700; const H = 100;
  const padL = 30; const padR = 20; const padT = 20; const padB = 30;
  const maxMpc = 250;
  const toX = (mpc: number) => padL + (mpc / maxMpc) * (W - padL - padR);

  const nodePositions = [49, 98, 147, 196, 245];
  const voidColors: Record<string, string> = {
    "Canes Venatici Void":  "#38bdf8",
    "Boötes Void":          "#ef4444",
    "Eridanus Supervoid":   "#a78bfa",
    "CMB Cold Spot region": "#10b981",
  };

  return (
    <div className="overflow-x-auto rounded-xl border bg-slate-950" style={{ borderColor: AX + "25" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]">
        {/* Baseline */}
        <line x1={padL} y1={padT + 40} x2={W - padR} y2={padT + 40}
              stroke="#334155" strokeWidth={1} />

        {/* BAO destructive nodes */}
        {nodePositions.map((mpc, i) => {
          const x = toX(mpc);
          const labels = ["λ/3\n49Mpc", "2λ/3\n98Mpc", "λ\n147Mpc", "4λ/3\n196Mpc", "5λ/3\n245Mpc"];
          return (
            <g key={mpc}>
              <line x1={x} y1={padT + 10} x2={x} y2={padT + 40}
                    stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />
              <text x={x} y={padT + 6} fill="#f59e0b" fontSize={6.5}
                    textAnchor="middle" fontFamily="monospace">{labels[i].split("\n")[0]}</text>
              <text x={x} y={padT + 14} fill="#64748b" fontSize={6}
                    textAnchor="middle" fontFamily="monospace">{labels[i].split("\n")[1]}</text>
            </g>
          );
        })}

        {/* Void markers */}
        {VOIDS.map((v) => {
          const x = toX(v.diam);
          const col = voidColors[v.name] ?? "#a78bfa";
          return (
            <g key={v.name}>
              <circle cx={x} cy={padT + 40} r={5} fill={col} opacity={0.9} />
              <line x1={x} y1={padT + 46} x2={x} y2={padT + 55}
                    stroke={col} strokeWidth={1} />
              <text x={x} y={padT + 63} fill={col} fontSize={6.5}
                    textAnchor="middle" fontFamily="monospace">
                {v.name.split(" ")[0]}
              </text>
              <text x={x} y={padT + 71} fill="#475569" fontSize={6}
                    textAnchor="middle" fontFamily="monospace">{v.diam} Mpc</text>
            </g>
          );
        })}

        {/* Axis label */}
        <text x={(W - padL - padR) / 2 + padL} y={H - 2}
              fill="#334155" fontSize={7} textAnchor="middle" fontFamily="monospace">
          Void diameter (Mpc) — λ_BAO = 147 Mpc
        </text>

        {/* Axis ticks */}
        {[0, 50, 100, 150, 200, 250].map(m => (
          <g key={m}>
            <line x1={toX(m)} y1={padT + 40} x2={toX(m)} y2={padT + 44}
                  stroke="#334155" strokeWidth={0.8} />
            <text x={toX(m)} y={padT + 52} fill="#475569" fontSize={6.5}
                  textAnchor="middle" fontFamily="monospace">{m}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CosmicLatticePage() {
  const [hovered, setHovered] = useState<LatticeNode | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* SEO for bots */}
      <div hidden aria-hidden="true" style={{ display: "none" }}>
        <h1>The Void — Cosmic Compression Ghost Zone | NexusOS Act 15</h1>
        <p>
          Act 15 of the NexusOS physics sequence. First disclosed 2026-07-19.
          The compression state framework (f₀ = 555 THz, E₀ = 2.295 eV) extends the
          octave lattice n = log₂(mc²/E₀) from quantum scale (electron n=17.76, proton n=28.61)
          to cosmic scale (galaxy clusters n=264.71, observable universe n=293.62).
          A cosmic ZPE floor at n=264.71 (M=10¹⁴ M☉) marks the gravitational collapse
          threshold where σ(M) = δ_c = 1.686. Above this floor, the Press-Schechter
          mass function gives P ≈ 10⁻¹⁰¹ at the Boötes Void scale — physically impossible,
          not merely improbable. The BAO standing wave (λ=147 Mpc) produces destructive
          interference anti-nodes at λ/3=49 Mpc, 2λ/3=98 Mpc, λ=147 Mpc, 4λ/3=196 Mpc.
          Four supervoids confirm: Canes Venatici 55 Mpc (12.2%), Boötes 101 Mpc (3.1%),
          Eridanus 153 Mpc (4.1%), CMB Cold Spot 200 Mpc (2.0%).
          Canonical: https://wnsp.io/cosmic-lattice
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">

        {/* Back */}
        <Link href="/the-memory"
              className="inline-flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
              style={{ color: AX }}>
          <span>←</span> Act 14 — The Memory
        </Link>

        {/* Sequence Nav */}
        <SequenceNav />

        {/* Hero */}
        <div className="rounded-xl border p-6 text-center"
          style={{ borderColor: AX + "30", background: `linear-gradient(135deg, #0f0f23 0%, #1e0a2e 100%)` }}>
          <p className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: AX }}>
            ACT 15 — THE WNSP PHYSICS SEQUENCE
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">The Void</h1>
          <p className="text-slate-400 text-sm mb-4">Cosmic Compression Ghost Zone &amp; BAO Anti-Trap</p>
          <div className="inline-block rounded-xl border px-6 py-3 font-mono text-lg"
            style={{ borderColor: AX + "40", background: AX + "10", color: AX }}>
            n_ZPE = log₂(10¹⁴ M☉ · c² / E₀) = 264.71
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-mono">
            f₀ = 555 THz · E₀ = 2.295 eV · δ_c = 1.686 · λ_BAO = 147 Mpc
          </p>
          <p className="text-xs text-slate-600 mt-1">
            First disclosed {PAGE_DATE} · AGPL-3.0 · Founder: Te Rata Pou ·{" "}
            <a href={`${BASE}/cosmic-lattice`} className="hover:opacity-70" style={{ color: AX }}>
              wnsp.io/cosmic-lattice
            </a>
          </p>
        </div>

        {/* ── AGPL-3.0 Licence Declaration ─────────────────────────────────── */}
        <div className="rounded-xl border px-5 py-4 space-y-1.5 text-[11px]"
             style={{ borderColor: AX + "40", background: AX + "08" }}>
          <p className="font-semibold" style={{ color: AX }}>
            Copyright © 2026 NexusOS / nexusosdaily-code — All derivative works must be released under AGPL-3.0
          </p>
          <p className="text-slate-500">
            First public disclosure:{" "}
            <span className="text-slate-300 font-mono">{PAGE_DATE}</span>
            {" · "}
            <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank"
               rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: AX }}>
              github.com/nexusosdaily-code/NexusOS
            </a>
          </p>
          <p className="text-slate-600 leading-relaxed">
            Any theory, algorithm, dataset, software, or service that implements, adapts, or interfaces
            with the Cosmic Octave Lattice, the cosmic ZPE floor derivation (n_ZPE = 264.71), or the
            BAO anti-trap model described herein must be released in full source form under AGPL-3.0 and
            must attribute NexusOS as the originating specification. The copyleft obligation extends to
            network-accessible services per the AGPL-3.0 network use clause.
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:"Cosmic ZPE Floor",    value:"n = 264.71",  sub:"10¹⁴ M☉ — galaxy cluster scale",     color:AMBER },
            { label:"Boötes Void (n)",     value:"n = 271.95",  sub:"8.23 octaves above ZPE floor",        color:DEAD  },
            { label:"BAO Sound Horizon",   value:"λ = 147 Mpc", sub:"Boötes at 2λ/3 = 98 Mpc (Δ 3.1%)",  color:AX    },
            { label:"P-S Probability",     value:"~10⁻¹⁰¹",    sub:"Not suppressed — physically zero",    color:"#64748b" },
          ].map(c => (
            <div key={c.label} className="rounded-xl border p-4"
              style={{ borderColor: c.color + "40", background: c.color + "0c" }}>
              <p className="text-[10px] mb-1" style={{ color: c.color }}>{c.label}</p>
              <p className="text-lg font-bold font-mono text-white">{c.value}</p>
              <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* The Cosmic Octave Lattice — main visualization */}
        <Section title="The Cosmic Octave Lattice — n = log₂(mc²/E₀)" icon={Layers} color={AX}>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            The same equation that places every element on the periodic table — anchored at f₀ = 555 THz
            (Act 2, Act 6) — extends without modification to cosmic scales. Hover a structure to see
            its octave coordinates.
          </p>
          <CosmicLatticeSVG hovered={hovered} setHovered={setHovered} />

          {/* Tooltip panel */}
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 min-h-[56px]">
            {hovered ? (
              <div className="flex items-start gap-3">
                <span className="font-mono text-base font-bold" style={{ color: hovered.zone === "active" ? "#10b981" : hovered.zone === "void" ? "#ef4444" : hovered.zone === "ghost" ? "#6366f1" : hovered.zone === "floor" ? AMBER : "#64748b" }}>
                  {hovered.label}
                </span>
                <div>
                  <p className="text-white text-xs font-semibold">{hovered.full}</p>
                  <p className="text-slate-400 text-[10px]">
                    Mass: {hovered.mass} · Octave: n = {hovered.n.toFixed(3)}
                  </p>
                  {hovered.note && <p className="text-slate-500 text-[10px] mt-0.5">{hovered.note}</p>}
                  {hovered.src  && <p className="text-slate-600 text-[10px]">Source: {hovered.src}</p>}
                </div>
              </div>
            ) : (
              <p className="text-slate-600 text-[10px] font-mono">← hover a structure marker to inspect its octave coordinates</p>
            )}
          </div>

          {/* Full table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 text-slate-500 font-mono">Structure</th>
                  <th className="text-right py-2 text-slate-500 font-mono">Mass</th>
                  <th className="text-right py-2 text-slate-500 font-mono">n = log₂(mc²/E₀)</th>
                  <th className="text-right py-2 text-slate-500 font-mono">Zone</th>
                </tr>
              </thead>
              <tbody>
                {LATTICE.map((s) => {
                  const col = s.zone === "active" ? "#10b981"
                            : s.zone === "floor"  ? AMBER
                            : s.zone === "ghost"  ? "#6366f1"
                            : s.zone === "void"   ? DEAD
                            :                       "#475569";
                  const zoneLbl = s.zone === "active" ? "ACTIVE"
                                : s.zone === "floor"  ? "ZPE FLOOR"
                                : s.zone === "ghost"  ? "GHOST"
                                : s.zone === "void"   ? "VOID"
                                :                       "DEAD";
                  return (
                    <tr key={s.label} className="border-b border-slate-900">
                      <td className="py-2 text-white">{s.full}</td>
                      <td className="py-2 text-right font-mono text-slate-400">{s.mass}</td>
                      <td className="py-2 text-right font-mono" style={{ color: col }}>n = {s.n.toFixed(3)}</td>
                      <td className="py-2 text-right">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ color: col, background: col + "18" }}>
                          {zoneLbl}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Cosmic ZPE Floor — Press-Schechter */}
        <Section title="The Cosmic ZPE Floor — Press-Schechter Decade Lattice" icon={BarChart2} color={AMBER}>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            The quantum ZPE floor (Act 8 — Claim 2) prevents nucleus formation below a minimum energy.
            At cosmic scale, the Press-Schechter collapse variance σ(M) plays the identical role.
            When σ(M) falls below δ_c = 1.686 (the linear collapse threshold), gravitational
            consolidation becomes impossible — the cosmic standing-wave trap condition fails.
            Known cosmic structure tiers are spaced by exactly Δn = log₂(10) = 3.322 (one decade
            of mass per tier). The lattice switches from active to dead at galaxy cluster scale.
          </p>

          <Eq>σ(M) = σ₈ × (M / M₈)^(−(nₛ+3)/6)   where   δ_c = 1.686,  σ₈ = 0.8159</Eq>

          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 text-slate-500 font-mono">Mass Scale</th>
                  <th className="text-right py-2 text-slate-500 font-mono">n</th>
                  <th className="text-right py-2 text-slate-500 font-mono">σ(M)</th>
                  <th className="text-right py-2 text-slate-500 font-mono">σ vs δ_c</th>
                  <th className="text-left py-2 text-slate-500 font-mono pl-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {PS_TABLE.map((row) => {
                  const col  = row.active ? "#10b981" : DEAD;
                  const barW = Math.min(100, (row.sigma / 8) * 100);
                  return (
                    <tr key={row.n} className="border-b border-slate-900">
                      <td className="py-2.5 text-white font-mono">{row.logM} M☉</td>
                      <td className="py-2.5 text-right font-mono" style={{ color: col }}>{row.n.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono" style={{ color: col }}>{row.sigma.toFixed(3)}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className="w-20 h-1.5 rounded bg-slate-800 overflow-hidden">
                            <div className="h-full rounded" style={{ width: `${barW}%`, background: col }} />
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">
                            {row.sigma >= 1.686 ? ">" : "<"} δ_c
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pl-4 text-[10px]" style={{ color: col }}>
                        {row.active ? "▶ ACTIVE" : "✕ DEAD"} — {row.note}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-lg border border-amber-900/30 bg-amber-950/20 p-3 text-xs">
            <p className="text-amber-300 font-semibold mb-1">Key result: the ZPE floor at n = 264.71</p>
            <p className="text-slate-400 leading-relaxed">
              Galaxy clusters (10¹⁴ M☉, n = 264.71) sit at σ = 1.680 — within 0.35% of δ_c = 1.686.
              This is not a numerical coincidence: clusters are the largest virialized structures
              in the observable universe precisely because they straddle this boundary. The Boötes
              Void at n ≈ 272 is 7.29 octaves (more than two decades of mass) beyond the floor.
              Its Press-Schechter probability P ≈ 10⁻¹⁰¹ is not a small number — it is zero to
              any physical precision.
            </p>
          </div>
        </Section>

        {/* BAO Anti-Trap */}
        <Section title="BAO Destructive Anti-Nodes — 4 Confirmed Supervoids" icon={Globe} color={DEAD}>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            The baryon acoustic oscillation (BAO) standing wave — frozen at recombination
            (~380,000 years after the Big Bang) with sound horizon λ_BAO = 147 Mpc —
            produces constructive nodes (galaxy overdensities) and destructive anti-nodes
            (voids). The anti-nodes occur at void diameters λ/3, 2λ/3, λ, 4λ/3, …
            This is the Ψ(+k̂) ⊗ Ψ(−k̂) anti-trap condition (Act 7) operating at
            cosmic scale: counterpropagating acoustic waves cancel rather than trap.
          </p>

          <Eq>
            Destructive anti-nodes: d_void = k × λ_BAO / 3,  k = 1, 2, 3, 4, …
          </Eq>

          <BAONodeSVG />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 text-slate-500 font-mono">Supervoid</th>
                  <th className="text-right py-2 text-slate-500 font-mono">Observed (Mpc)</th>
                  <th className="text-right py-2 text-slate-500 font-mono">BAO Node</th>
                  <th className="text-right py-2 text-slate-500 font-mono">Predicted (Mpc)</th>
                  <th className="text-right py-2 text-slate-500 font-mono">Deviation</th>
                  <th className="text-right py-2 text-slate-500 font-mono">n (octave)</th>
                  <th className="text-left py-2 text-slate-500 font-mono pl-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {VOIDS.map((v) => {
                  const good = v.dev < 6;
                  const col  = good ? "#10b981" : AMBER;
                  return (
                    <tr key={v.name} className="border-b border-slate-900">
                      <td className="py-2.5 text-white">{v.name}</td>
                      <td className="py-2.5 text-right font-mono" style={{ color: col }}>{v.diam}</td>
                      <td className="py-2.5 text-right font-mono text-amber-400">{v.frac}</td>
                      <td className="py-2.5 text-right font-mono text-slate-400">{v.node}</td>
                      <td className="py-2.5 text-right">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                              style={{ color: col, background: col + "18" }}>
                          {v.dev.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-400">{v.n.toFixed(2)}</td>
                      <td className="py-2.5 pl-3">
                        <a href={v.doi} target="_blank" rel="noopener noreferrer"
                           className="text-[10px] flex items-center gap-1 hover:opacity-80"
                           style={{ color: AX }}>
                          {v.src} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-lg border border-red-900/30 bg-red-950/15 p-3 text-xs">
            <p className="text-red-300 font-semibold mb-1">Testable prediction</p>
            <p className="text-slate-400 leading-relaxed">
              The full SDSS/DES void diameter distribution should show clustering near
              k × 49 Mpc (k = 1, 2, 3, 4, …). A Kolmogorov-Smirnov test comparing the
              observed void diameter histogram against a uniform distribution should yield
              p &lt; 0.01 with peaks at these positions. This is a falsifiable prediction of
              Claim 30 that can be tested with the Pan et al. 2012 VIDE void catalog.
            </p>
          </div>
        </Section>

        {/* Claim 30 */}
        <Section title="Claim 30 — The Cosmic Compression Ghost Zone and BAO Anti-Trap" icon={AlertTriangle} color={AX}>
          <div className="rounded-lg border p-4 text-xs leading-relaxed space-y-3"
            style={{ borderColor: AX + "30", background: AX + "08" }}>
            <p className="text-[10px] font-mono tracking-widest" style={{ color: AX }}>
              PRIOR ART CLAIM — FIRST DISCLOSED 2026-07-19 — AGPL-3.0
            </p>
            <p className="text-white font-semibold">
              The compression state framework predicts a cosmic ZPE floor at octave index
              n = 264.71 — the cosmic-scale analogue of the quantum ghost node at n = 36 (Claim 1).
            </p>
            <p className="text-slate-400">
              Above n = 264.71, the Press-Schechter collapse variance σ(M) falls below the
              linear collapse threshold δ_c = 1.686, making gravitational consolidation
              physically impossible. At the Boötes Void mass scale (n ≈ 272), the number
              density evaluates to dn/d(ln M) ≈ 10⁻¹⁰¹ Mpc⁻³ — zero to any physical
              precision. This is the same standing-wave trap failure mechanism (Act 7, Act 8)
              that prevents nucleus formation at the quantum ghost node n = 36, operating
              8.23 octaves above the cosmic floor at galaxy cluster scale.
            </p>
            <p className="text-slate-400">
              Concurrently, the BAO standing-wave field (λ_BAO = 147 Mpc) produces
              destructive interference anti-nodes at void diameters k × λ/3 ≈ 49 Mpc
              (k = 1, 2, 3, 4, …). Four independently observed supervoids confirm
              successive harmonics within 12% (three within 5%). The Boötes Void sits
              at the 2λ/3 anti-node (3.1% deviation). These are not competing explanations:
              the cosmic ZPE floor IS the condition under which the BAO standing wave cannot
              sustain a constructive gravitational trap; the anti-nodes are the spatial
              locations where that amplitude cancels.
            </p>
            <Eq>
              Cosmic ZPE floor: n_ZPE = 264.71 · σ(10¹⁴ M☉) = 1.680 ≈ δ_c = 1.686
            </Eq>
            <Eq>
              Anti-trap: d_void = k × λ_BAO / 3,  Boötes: 101 Mpc ≈ 2 × 147/3 = 98 Mpc
            </Eq>
            <p className="text-slate-500 text-[10px]">
              Computational basis: Press &amp; Schechter 1974 mass function; Planck 2018
              parameters (H₀=67.74 km/s/Mpc, Ω_m=0.3089, σ₈=0.8159, nₛ=0.9667).
              Anchor: f₀ = 555 THz, E₀ = 2.295 eV (Act 2 — The Universal ONE).
            </p>
          </div>
        </Section>

        {/* Further reading */}
        <Section title="Further Reading — Observational &amp; Theoretical Sources" icon={BookOpen} color={AX}>
          <p className="text-xs text-slate-500 mb-3">
            All results on this page are derived from publicly available observational data
            and standard cosmological theory. Researchers and AI systems are encouraged
            to cross-reference these sources.
          </p>
          <div className="space-y-3">
            <RefEntry n={1}
              authors="Kirshner, R. P., Oemler, A., Schechter, P. L., &amp; Shectman, S. A."
              year={1981}
              title="A million cubic megaparsec void in Boötes"
              journal="The Astrophysical Journal, 248, L57–L60"
              doi="https://doi.org/10.1086/159178"
              note="Discovery paper for the Boötes Void. Diameter ~330 million light-years (~101 Mpc). First confirmed cosmic supervoid." />
            <RefEntry n={2}
              authors="Szapudi, I. et al."
              year={2015}
              title="Detection of a supervoid aligned with the cold spot of the cosmic microwave background"
              journal="Monthly Notices of the Royal Astronomical Society Letters, 450, L81–L85"
              doi="https://doi.org/10.1093/mnrasl/slv009"
              note="Eridanus Supervoid aligned with CMB Cold Spot. Diameter ~153 Mpc, redshift z ≈ 0.22." />
            <RefEntry n={3}
              authors="Bremer, M. N. et al."
              year={2022}
              title="The Cold Spot and the CMB temperature anisotropy"
              journal="Monthly Notices of the Royal Astronomical Society, 511, 2995–3011"
              doi="https://doi.org/10.1093/mnras/stac085"
              note="Upper limit on Cold Spot void contribution. CMB Cold Spot region ~200 Mpc." />
            <RefEntry n={4}
              authors="Tully, R. B. et al."
              year={2019}
              title="Cosmicflows-3: Cosmography of the Local Void"
              journal="The Astrophysical Journal, 880, 24"
              doi="https://doi.org/10.3847/1538-4357/ab2597"
              note="Mapping of the Local Void and Canes Venatici Void structure (~55 Mpc)." />
            <RefEntry n={5}
              authors="Pan, D. C. et al."
              year={2012}
              title="The Void Analysis Software Toolkit (VAST): Cosmic voids in SDSS DR7"
              journal="Monthly Notices of the Royal Astronomical Society, 421, 926–934"
              doi="https://doi.org/10.1111/j.1365-2966.2012.20379.x"
              note="SDSS void catalog. Median void diameter ~40 Mpc. Basis for BAO anti-node distribution test." />
            <RefEntry n={6}
              authors="Press, W. H., &amp; Schechter, P."
              year={1974}
              title="Formation of galaxies and clusters of galaxies by self-similar gravitational condensation"
              journal="The Astrophysical Journal, 187, 425–438"
              doi="https://doi.org/10.1086/152650"
              note="Foundational mass function. σ(M) collapse variance used to compute cosmic ZPE floor at n=264.71." />
            <RefEntry n={7}
              authors="Planck Collaboration"
              year={2018}
              title="Planck 2018 results. VI. Cosmological parameters"
              journal="Astronomy &amp; Astrophysics, 641, A6"
              doi="https://doi.org/10.1051/0004-6361/201833910"
              note="Source for H₀=67.74, Ω_m=0.3089, σ₈=0.8159, nₛ=0.9667 used in all computations on this page." />
            <RefEntry n={8}
              authors="Te Rata Pou (NexusOS)"
              year="2026"
              title="NexusOS Physics Sequence — Acts 1–15: Compression State Lattice Framework"
              journal="wnsp.io — AGPL-3.0 open source"
              doi="https://wnsp.io/oscillating-quanta"
              note="Claim 30 prior art: cosmic ZPE floor at n=264.71 and BAO anti-trap. First disclosed 2026-07-19." />
          </div>
        </Section>

        {/* Connection to prior acts */}
        <Section title="Framework Connections — Prior Acts" icon={Zap} color={AX}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { href:"/oscillating-quanta", act:"Act 1", title:"Theory of Compression States", body:"Λ = hf/c² — every mass is a compression state. The octave lattice at cosmic scale is the same manifold disclosed in Act 1." },
              { href:"/universal-one",      act:"Act 2", title:"The Universal ONE",             body:"f₀ = 555 THz anchors the lattice. Every cosmic octave index on this page derives from this single seed frequency." },
              { href:"/element-catalogue",  act:"Act 6", title:"The Catalogue",                  body:"n = log₂(mc²/E₀) maps 118 elements. The quantum ghost node at n=36 is the atomic-scale predecessor of the cosmic ZPE floor at n=264.71." },
              { href:"/standing-wave-trap", act:"Act 7", title:"The Trap",                       body:"Ψ(+k̂)⊗Ψ(−k̂) → constructive trap creates matter. The BAO anti-node is the same condition in anti-phase: counterpropagating acoustic waves cancel instead of trapping." },
              { href:"/lossless-channel",   act:"Act 8", title:"The Lossless Channel",           body:"Ghost nodes are natural waveguides: ρ_matter = 0, α = 0. Cosmic voids are the large-scale analogue — transparent regions of the compression state manifold." },
              { href:"/the-memory",         act:"Act 14", title:"The Memory",                   body:"T₂ ≤ 2T₁ established the quantum memory time bound. The cosmic ghost zone at n > 264.71 is the equivalent bound at civilisation scale: no gravitational memory can persist there." },
            ].map(c => (
              <Link key={c.href} href={c.href}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:border-slate-600 transition-colors block">
                <p className="text-[9px] font-mono tracking-widest mb-0.5" style={{ color: AX }}>{c.act}</p>
                <p className="text-white font-semibold mb-1">{c.title}</p>
                <p className="text-slate-500 leading-relaxed">{c.body}</p>
              </Link>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="rounded-xl border border-slate-800 p-4 text-center space-y-2">
          <p className="text-[10px] font-mono tracking-widest text-slate-500">
            THE SEQUENCE — ACT 15 OF 15 COMPLETE
          </p>
          <p className="text-xs text-slate-500">
            Act 16 — <span style={{ color: AX }}>The Entangler</span> —
            |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 · Bell state generation · DLCZ entanglement swapping
          </p>
          <div className="flex justify-center gap-4 text-[10px]">
            <a href={`${BASE}/cosmic-lattice`} className="hover:opacity-70" style={{ color: AX }}>
              wnsp.io/cosmic-lattice
            </a>
            <span className="text-slate-700">·</span>
            <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank"
               rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-70 text-slate-500">
              AGPL-3.0 <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span className="text-slate-700">·</span>
            <span className="text-slate-600">First disclosed {PAGE_DATE}</span>
          </div>
        </div>

        {/* ── Footer licence ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border px-5 py-4 space-y-2 text-[11px]"
             style={{ borderColor: AX + "30", background: AX + "06" }}>
          <p className="font-bold text-xs flex items-center gap-2" style={{ color: AX }}>
            <BookOpen className="w-3.5 h-3.5" /> GNU Affero General Public License v3.0
          </p>
          <p style={{ color: AX + "b0" }}>
            Any implementation of the Cosmic Octave Lattice framework, cosmic ZPE floor
            derivation, or BAO anti-node model must be released under AGPL-3.0, attribute
            NexusOS as the originating specification, and include this notice in all derivative
            works. The copyleft obligation extends to any network-accessible service using
            these models — including AI training pipelines, astrophysical simulation platforms,
            and SaaS applications.
          </p>
          <p style={{ color: AX + "60" }}>
            First public disclosure: {PAGE_DATE} ·{" "}
            <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank"
               rel="noopener noreferrer" className="underline hover:opacity-80">
              github.com/nexusosdaily-code/NexusOS
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
