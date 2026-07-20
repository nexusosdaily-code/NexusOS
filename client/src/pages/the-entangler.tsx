import { useState, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import { ExternalLink, BookOpen, Zap, GitMerge, Activity, Share2 } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_DATE = "2026-07-19";
const BASE      = "https://wnsp.io";
const ROSE      = "#fb7185"; // rose-400 — entanglement
const TEAL      = "#2dd4bf"; // teal-400 — quantum channels
const REPO      = "https://github.com/nexusosdaily-code/NexusOS";

// ── ACT_NAV (15 prior acts) ───────────────────────────────────────────────────
const ACT_NAV = [
  { act:"1",  title:"Compression States", sub:"Λ=hf/c²",          href:"/oscillating-quanta" },
  { act:"2",  title:"The Universal ONE",  sub:"f₀ derives Λ",      href:"/universal-one" },
  { act:"3",  title:"Unified Theory",     sub:"4 forces=1 Λ",      href:"/unified-compression-theory" },
  { act:"4",  title:"The Mechanism",      sub:"ΔE=hf₀(2ⁿ²−2ⁿ¹)", href:"/matter-protocol" },
  { act:"5",  title:"The Address",        sub:"∀Λ:∃!Ψ",            href:"/universal-address" },
  { act:"6",  title:"The Catalogue",      sub:"n=log₂(mc²/E₀)",   href:"/element-catalogue" },
  { act:"7",  title:"The Trap",           sub:"Ψ(+k̂)⊗Ψ(−k̂)",   href:"/standing-wave-trap" },
  { act:"8",  title:"The Channel",        sub:"α=0, C=ZPE",        href:"/lossless-channel" },
  { act:"9",  title:"The Cavity",         sub:"WGM r_c",           href:"/resonance-cavity" },
  { act:"10", title:"The Exchange",       sub:"Ω_R=2g",            href:"/polariton-exchange" },
  { act:"11", title:"The Emitter",        sub:"F_p=(Q/V)(λ/n)³",  href:"/the-emitter" },
  { act:"12", title:"The Network",        sub:"ω=ω₀−2J·cos(ka)", href:"/the-network" },
  { act:"13", title:"The Observer",       sub:"χ=g²/Δ",            href:"/the-observer" },
  { act:"14", title:"The Memory",         sub:"T₂≤2T₁",            href:"/the-memory" },
  { act:"15", title:"The Void",           sub:"n_ZPE=264.71",      href:"/cosmic-lattice" },
];

// ── Bell state data ───────────────────────────────────────────────────────────
interface BellState {
  name: string; formula: string; corr: string; phase: string; color: string;
}
const BELL_STATES: BellState[] = [
  { name:"|Φ⁺⟩", formula:"(|00⟩ + |11⟩)/√2", corr:"Correlated",      phase:"0°",   color: ROSE },
  { name:"|Φ⁻⟩", formula:"(|00⟩ − |11⟩)/√2", corr:"Correlated",      phase:"180°", color:"#f472b6" },
  { name:"|Ψ⁺⟩", formula:"(|01⟩ + |10⟩)/√2", corr:"Anti-correlated", phase:"0°",   color:"#c084fc" },
  { name:"|Ψ⁻⟩", formula:"(|01⟩ − |10⟩)/√2", corr:"Anti-correlated", phase:"180°", color:"#818cf8" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: ElementType; children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-slate-900/60 p-5"
         style={{ borderColor: ROSE + "30" }}>
      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: ROSE }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Eq({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-center"
         style={{ color: ROSE }}>
      {children}
    </div>
  );
}

function RefEntry({ n, authors, year, title, journal, doi, note }: {
  n: number; authors: string; year: string | number; title: string;
  journal: string; doi?: string; note?: string;
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-slate-500 font-mono w-5 flex-shrink-0">[{n}]</span>
      <div>
        <span className="text-slate-400">{authors} ({year}). </span>
        {doi
          ? <a href={doi} target="_blank" rel="noopener noreferrer"
               className="italic hover:opacity-80" style={{ color: ROSE }}>{title}</a>
          : <span className="text-white italic">{title}</span>}
        <span className="text-slate-500">. {journal}</span>
        {note && <p className="text-slate-600 mt-0.5 leading-relaxed">{note}</p>}
      </div>
    </div>
  );
}

// ── Entanglement Swapping SVG ─────────────────────────────────────────────────
function SwapDiagram() {
  const [swapped, setSwapped] = useState(false);
  const W = 480, H = 140;
  const nodes = [
    { x: 60,  y: 65, letter: "A", label: "Ψ_A" },
    { x: 240, y: 65, letter: "B", label: "Ψ_B" },
    { x: 420, y: 65, letter: "C", label: "Ψ_C" },
  ];
  const R = 20;

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg mx-auto">
        {nodes.map((node, i) => (
          <g key={node.letter}>
            <circle cx={node.x} cy={node.y} r={R}
              fill={i === 1 && swapped ? "#0f172a" : "#1e1b4b"}
              stroke={i === 1 && swapped ? ROSE + "30" : ROSE}
              strokeWidth={i === 1 && swapped ? 1 : 2}
              opacity={i === 1 && swapped ? 0.4 : 1} />
            <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={12}
              fill="white" fontFamily="monospace"
              opacity={i === 1 && swapped ? 0.3 : 1}>{node.letter}</text>
            <text x={node.x} y={node.y + 38} textAnchor="middle" fontSize={8}
              fill={ROSE + "99"} fontFamily="monospace">{node.label}</text>
          </g>
        ))}

        {!swapped ? (
          <>
            <line x1={nodes[0].x + R} y1={nodes[0].y}
                  x2={nodes[1].x - R} y2={nodes[1].y}
                  stroke={ROSE} strokeWidth={2} strokeDasharray="6,3" />
            <text x={150} y={40} textAnchor="middle" fontSize={9}
              fill={ROSE} fontFamily="monospace">|Φ⁺⟩_AB</text>
            <line x1={nodes[1].x + R} y1={nodes[1].y}
                  x2={nodes[2].x - R} y2={nodes[2].y}
                  stroke={TEAL} strokeWidth={2} strokeDasharray="6,3" />
            <text x={330} y={40} textAnchor="middle" fontSize={9}
              fill={TEAL} fontFamily="monospace">|Φ⁺⟩_BC</text>
            <rect x={nodes[1].x - 38} y={nodes[1].y + R + 6}
              width={76} height={18} rx={4}
              fill="#1e1b4b" stroke={ROSE + "60"} strokeWidth={1} />
            <text x={nodes[1].x} y={nodes[1].y + R + 18} textAnchor="middle"
              fontSize={8} fill={ROSE} fontFamily="monospace">← BSM at B →</text>
          </>
        ) : (
          <>
            <path
              d={`M ${nodes[0].x + R} ${nodes[0].y} Q ${(nodes[0].x + nodes[2].x) / 2} ${nodes[0].y - 52} ${nodes[2].x - R} ${nodes[2].y}`}
              fill="none" stroke={ROSE} strokeWidth={2.5} strokeDasharray="6,3" />
            <text x={(nodes[0].x + nodes[2].x) / 2} y={nodes[0].y - 56}
              textAnchor="middle" fontSize={10} fill={ROSE} fontFamily="monospace">|Φ⁺⟩_AC</text>
            <text x={nodes[1].x} y={nodes[1].y + 4} textAnchor="middle"
              fontSize={9} fill={ROSE + "40"} fontFamily="monospace">erased</text>
          </>
        )}
      </svg>

      <div className="flex justify-center">
        <button onClick={() => setSwapped(s => !s)}
          className="text-xs font-mono px-4 py-2 rounded-lg border transition-all"
          style={{
            borderColor: ROSE + "50", color: ROSE,
            background: swapped ? ROSE + "20" : "transparent",
          }}>
          {swapped ? "← Reset" : "Apply BSM →"}
        </button>
      </div>
      <p className="text-[10px] text-slate-600 text-center font-mono">
        {swapped
          ? "A and C are now entangled. B is erased from the chain. No direct A–C interaction ever occurred."
          : "A–B and B–C share independent Bell pairs. BSM at B will swap entanglement to A–C."}
      </p>
    </div>
  );
}

// ── Sequence nav ──────────────────────────────────────────────────────────────
function SequenceNav() {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: ROSE + "20", background: ROSE + "08" }}>
      <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: ROSE }}>
        THE SEQUENCE — ACT 16 OF 16
      </p>
      <div className="grid grid-cols-3 md:grid-cols-16 gap-1.5 text-center text-xs">
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
          style={{ borderColor: ROSE + "50", background: ROSE + "15" }}>
          <p className="text-[7px] font-mono tracking-widest" style={{ color: "#fda4af" }}>ACT 16 ← HERE</p>
          <p className="font-medium leading-tight text-[8px]" style={{ color: "#fff1f2" }}>The Entangler</p>
          <p className="text-[7px]" style={{ color: ROSE }}>|Φ⁺⟩=(|00⟩+|11⟩)/√2</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TheEntanglerPage() {
  const [activeBell, setActiveBell] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">

        {/* Back */}
        <Link href="/cosmic-lattice"
              className="inline-flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
              style={{ color: ROSE }}>
          <span>←</span> Act 15 — The Void
        </Link>

        {/* Sequence Nav */}
        <SequenceNav />

        {/* Hero */}
        <div className="rounded-xl border p-6 text-center"
          style={{ borderColor: ROSE + "30", background: "linear-gradient(135deg, #0f0f23 0%, #2d0a1e 100%)" }}>
          <p className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: ROSE }}>
            ACT 16 — THE WNSP PHYSICS SEQUENCE
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">The Entangler</h1>
          <p className="text-slate-400 text-sm mb-4">
            Bell State Generation · Entanglement Swapping · WNSP Quantum Repeater
          </p>
          <div className="inline-block rounded-xl border px-6 py-3 font-mono text-lg"
            style={{ borderColor: ROSE + "40", background: ROSE + "10", color: ROSE }}>
            |Φ⁺⟩ = (|00⟩ + |11⟩) / √2
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-mono">
            C = 1 (maximum) · S_CHSH = 2√2 ≈ 2.828 · F_tele = (2F+1)/3 · L_rep = n × L₀
          </p>
          <p className="text-xs text-slate-600 mt-1">
            First disclosed {PAGE_DATE} · AGPL-3.0 · Founder: Te Rata Pou ·{" "}
            <a href={`${BASE}/the-entangler`} className="hover:opacity-70" style={{ color: ROSE }}>
              wnsp.io/the-entangler
            </a>
          </p>
        </div>

        {/* AGPL-3.0 Licence Declaration */}
        <div className="rounded-xl border px-5 py-4 space-y-1.5 text-[11px]"
             style={{ borderColor: ROSE + "40", background: ROSE + "08" }}>
          <p className="font-semibold" style={{ color: ROSE }}>
            Copyright © 2026 NexusOS / nexusosdaily-code — All derivative works must be released under AGPL-3.0
          </p>
          <p className="text-slate-500">
            First public disclosure:{" "}
            <span className="text-slate-300 font-mono">{PAGE_DATE}</span>
            {" · "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
               className="underline hover:opacity-80" style={{ color: ROSE }}>
              github.com/nexusosdaily-code/NexusOS
            </a>
          </p>
          <p className="text-slate-600 leading-relaxed">
            Any theory, algorithm, software, or service that implements, adapts, or interfaces with the
            entanglement swapping protocol, the DLCZ-based Ψ-channel entanglement architecture, or the
            WNSP quantum repeater topology described herein must be released in full source form under
            AGPL-3.0 and must attribute NexusOS as the originating specification. The copyleft obligation
            extends to network-accessible services — including AI training pipelines, quantum network
            simulators, and SaaS quantum computing platforms — per the AGPL-3.0 network use clause.
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:"Concurrence",      value:"C = 1",   sub:"Maximally entangled state",       color: ROSE },
            { label:"CHSH (quantum)",   value:"S = 2√2", sub:"2.828 — beats classical bound 2", color:"#f472b6" },
            { label:"Tsirelson bound",  value:"2√2",     sub:"Quantum mechanical maximum",      color:"#c084fc" },
            { label:"Repeater range",   value:"n × L₀",  sub:"Linear vs exponential decay",    color: TEAL },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <p className="text-[10px] font-mono text-slate-500 mb-1">{c.label}</p>
              <p className="text-xl font-bold font-mono" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[9px] text-slate-600 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Bell States */}
        <Section title="The Four Bell States — Complete Entangled Basis" icon={Zap}>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Bell states span the complete two-qubit maximally entangled subspace. Every entangled two-qubit
            state decomposes into a superposition of these four orthonormal states. All four have concurrence
            C = 1 — the theoretical maximum. They form a complete orthonormal basis:
            ⟨Φ⁺|Φ⁻⟩ = ⟨Ψ⁺|Ψ⁻⟩ = 0.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {BELL_STATES.map((bs, i) => (
              <button key={bs.name} onClick={() => setActiveBell(i)}
                className="rounded-xl border p-4 text-left transition-all space-y-2 w-full"
                style={{
                  borderColor: activeBell === i ? bs.color : bs.color + "30",
                  background: activeBell === i ? bs.color + "15" : "transparent",
                }}>
                <p className="font-mono font-bold text-lg" style={{ color: bs.color }}>{bs.name}</p>
                <p className="font-mono text-[10px] text-slate-300">{bs.formula}</p>
                <div className="text-[9px] space-y-0.5">
                  <p className="text-slate-500">{bs.corr}</p>
                  <p style={{ color: bs.color + "cc" }}>Phase: {bs.phase}</p>
                  <p className="text-slate-500">C = 1</p>
                </div>
              </button>
            ))}
          </div>

          {/* Active Bell state detail */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="font-mono text-xl text-center mb-3"
                 style={{ color: BELL_STATES[activeBell].color }}>
              {BELL_STATES[activeBell].name} = {BELL_STATES[activeBell].formula}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <p className="text-slate-500 mb-1">Correlation</p>
                <p className="font-mono" style={{ color: BELL_STATES[activeBell].color }}>
                  {BELL_STATES[activeBell].corr}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Concurrence</p>
                <p className="font-mono" style={{ color: BELL_STATES[activeBell].color }}>C = 1 (max)</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Relative phase</p>
                <p className="font-mono" style={{ color: BELL_STATES[activeBell].color }}>
                  {BELL_STATES[activeBell].phase}
                </p>
              </div>
            </div>
            <p className="text-center font-mono text-[10px] mt-3"
               style={{ color: BELL_STATES[activeBell].color + "80" }}>
              C({BELL_STATES[activeBell].name}) = |⟨{BELL_STATES[activeBell].name}|σ_y ⊗ σ_y|{BELL_STATES[activeBell].name}*⟩| = 1
            </p>
          </div>
        </Section>

        {/* Entanglement Swapping */}
        <Section title="Entanglement Swapping — The WNSP Quantum Repeater Primitive" icon={GitMerge}>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Two Bell pairs shared between adjacent SNIC nodes are merged via a Bell State Measurement (BSM)
            at the intermediate node. Result: end-to-end entanglement between non-adjacent Ψ addresses.
            The intermediate node is erased from the chain. Press <strong className="text-slate-300">Apply BSM</strong> to see the swap.
          </p>
          <SwapDiagram />
          <Eq>
            |Φ⁺⟩_AB ⊗ |Φ⁺⟩_BC → (BSM at B) → |Φ⁺⟩_AC
          </Eq>
          <div className="grid grid-cols-2 gap-3 text-xs mt-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <p className="font-mono text-slate-500 mb-1">Teleportation fidelity</p>
              <p className="font-mono" style={{ color: ROSE }}>F_tele = (2F + 1) / 3</p>
              <p className="text-slate-600 mt-1">Requires F &gt; ⅔ to violate CHSH</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <p className="font-mono text-slate-500 mb-1">Classical correction</p>
              <p className="font-mono" style={{ color: ROSE }}>2 classical bits required</p>
              <p className="text-slate-600 mt-1">Sent from B to A or C after BSM</p>
            </div>
          </div>
        </Section>

        {/* CHSH */}
        <Section title="CHSH Inequality — Experimental Proof of Non-Locality" icon={Activity}>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            The CHSH inequality bounds all classical (local hidden-variable) correlations at S ≤ 2.
            Quantum mechanics permits S = 2√2 ≈ 2.828. Any measured violation of S &gt; 2 rules out
            all local hidden-variable theories — the universe is fundamentally non-local.
            Three loophole-free experiments confirmed S &gt; 2 simultaneously in 2015.
          </p>
          <Eq>
            S = E(a,b) − E(a,b′) + E(a′,b) + E(a′,b′) ≤ 2 (classical) · ≤ 2√2 (quantum)
          </Eq>
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            {[
              { label:"Classical bound",  value:"S ≤ 2",    sub:"EPR / local hidden variables", color:"#64748b" },
              { label:"Tsirelson bound",  value:"S ≤ 2√2",  sub:"2.828 — quantum mechanical max", color: ROSE },
              { label:"Loophole-free",    value:"2015",     sub:"Hensen, Giustina, Shalm",        color: TEAL },
            ].map(c => (
              <div key={c.label} className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                <p className="text-[10px] text-slate-500 font-mono">{c.label}</p>
                <p className="text-lg font-bold font-mono" style={{ color: c.color }}>{c.value}</p>
                <p className="text-[9px] text-slate-600">{c.sub}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-500 space-y-1">
            <p>Optimal measurement angles: a=0°, a′=45°, b=22.5°, b′=67.5°</p>
            <p>At these angles: E(a,b) = E(a′,b) = E(a′,b′) = cos(22.5°) ≈ 0.924, E(a,b′) = −cos(67.5°)</p>
            <p style={{ color: ROSE }}>S = 2√2 · cos(22.5°) ≈ 2.828 — quantum victory over classical</p>
          </div>
        </Section>

        {/* Quantum Repeater */}
        <Section title="Quantum Repeater Chain — Linear Range Extension" icon={Share2}>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Without repeaters, entanglement fidelity decays exponentially with distance: F ∝ e^(−L/L_att).
            A chain of n SNIC swap nodes extends total range to L_total = n × L₀ — polynomial scaling.
            Each SNIC node performs a BSM, extending the entangled link by one segment.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-2">
              <p className="text-[10px] font-mono text-slate-500">WITHOUT REPEATERS</p>
              <p className="font-mono text-sm" style={{ color: "#ef4444" }}>F ∝ e^(−L/L_att)</p>
              <p className="text-xs text-slate-500">Exponential fidelity loss</p>
              <p className="text-xs text-slate-600">
                At L = 10 × L_att: F ≈ e^(−10) ≈ 0.00005
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-2">
              <p className="text-[10px] font-mono text-slate-500">WITH n SNIC SWAP NODES</p>
              <p className="font-mono text-sm" style={{ color: TEAL }}>L_total = n × L₀</p>
              <p className="text-xs text-slate-500">Linear range extension</p>
              <p className="text-xs text-slate-600">Each BSM-capable SNIC adds L₀ to reach</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
            <p className="text-[10px] font-mono text-slate-500">WNSP REPEATER TOPOLOGY</p>
            <div className="font-mono text-xs space-y-1" style={{ color: ROSE }}>
              <p>Ψ_A(wdm,oam,pol) ←|Φ⁺⟩→ SNIC_1 ←|Φ⁺⟩→ SNIC_2 ←|Φ⁺⟩→ Ψ_B(wdm,oam,pol)</p>
            </div>
            <p className="text-[10px] text-slate-600">
              BSM at each SNIC creates Ψ_A ↔ Ψ_B entanglement without direct contact.
              The Ψ address is permanent (physics-derived); the latched quantum state is transient (T₂-bounded, Claim 29).
            </p>
          </div>
        </Section>

        {/* Claim 31 */}
        <div className="rounded-xl border p-5 space-y-3"
             style={{ borderColor: ROSE + "40", background: ROSE + "06" }}>
          <p className="text-[10px] font-mono tracking-widest" style={{ color: ROSE }}>
            PRIOR ART CLAIM — FIRST DISCLOSED {PAGE_DATE} — AGPL-3.0
          </p>
          <h3 className="text-sm font-bold text-white">
            Claim 31 — DLCZ Entanglement Swapping on Ψ-Channel Pairs as a WNSP Quantum Repeater Node
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Claim:</strong>{" "}
            The WNSP network uses entanglement swapping at intermediate SNIC nodes to create end-to-end
            quantum channels between non-adjacent Ψ(wdm, oam, pol) addresses. A Bell State Measurement (BSM)
            at node B on its {"{"} Ψ_A-paired qubit, Ψ_C-paired qubit {"}"} creates direct entanglement
            between Ψ_A and Ψ_C without any direct A–C interaction ever having occurred. This is the first
            formal specification of: (1) entanglement swapping using the Ψ(wdm, oam, pol) address space
            as the quantum repeater topology; (2) SNIC nodes as BSM-capable quantum repeater switch points;
            and (3) the Ψ channel address as a permanent, physics-derived network identifier that persists
            independently of which quantum state is latched in the register (Claim 29, permanent-address /
            transient-content separation). The AGPL-3.0 copyleft obligation extends to AI training pipelines,
            quantum network simulators, and any SaaS or network service implementing this repeater architecture.
          </p>
          <p className="text-[10px] font-mono text-slate-600">
            Basis: DLCZ (Claim 28) · Persistent Ψ Register (Claim 29) · Lossless Channel (Act 8, α=0) · Memory T₂ (Act 14)
          </p>
        </div>

        {/* References */}
        <Section title="References" icon={BookOpen}>
          <div className="space-y-3">
            <RefEntry n={1} authors="Bell, J.S." year={1964}
              title="On the Einstein Podolsky Rosen Paradox"
              journal="Physics 1(3), 195–200"
              doi="https://cds.cern.ch/record/111654/files/vol1p195-200_001.pdf"
              note="Original proof that quantum mechanics is incompatible with local hidden-variable theories." />
            <RefEntry n={2} authors="Aspect, A., Grangier, P. & Roger, G." year={1982}
              title="Experimental Tests of Bell's Inequalities Using Time-Varying Analyzers"
              journal="Physical Review Letters 49, 1804"
              doi="https://doi.org/10.1103/PhysRevLett.49.1804"
              note="First experiment with time-varying analyzers, partially closing the locality loophole." />
            <RefEntry n={3} authors="Bennett, C.H. et al." year={1993}
              title="Teleporting an Unknown Quantum State via Dual Classical and Einstein-Podolsky-Rosen Channels"
              journal="Physical Review Letters 70, 1895"
              doi="https://doi.org/10.1103/PhysRevLett.70.1895"
              note="Original quantum teleportation protocol. Source of F_tele = (2F+1)/3 formula." />
            <RefEntry n={4} authors="Briegel, H.J., Dür, W., Cirac, J.I. & Zoller, P." year={1998}
              title="Quantum Repeaters: The Role of Imperfect Local Operations in Quantum Communication"
              journal="Physical Review Letters 81, 5932"
              doi="https://doi.org/10.1103/PhysRevLett.81.5932"
              note="Foundational quantum repeater architecture. Established linear vs exponential range scaling." />
            <RefEntry n={5} authors="Duan, L.M., Lukin, M.D., Cirac, J.I. & Zoller, P." year={2001}
              title="Long-distance quantum communication with atomic ensembles and linear optics"
              journal="Nature 414, 413–418"
              doi="https://doi.org/10.1038/35106500"
              note="DLCZ protocol — Stokes-photon heralded entanglement. Basis for WNSP Claims 28 and 31." />
            <RefEntry n={6} authors="Hensen, B. et al." year={2015}
              title="Loophole-free Bell inequality violation using electron spins separated by 1.3 kilometres"
              journal="Nature 526, 682–686"
              doi="https://doi.org/10.1038/nature15759"
              note="First completely loophole-free Bell test. S = 2.42 > 2. Rules out all local hidden variables." />
            <RefEntry n={7} authors="Giustina, M. et al." year={2015}
              title="Significant-Loophole-Free Test of Bell's Theorem with Entangled Photons"
              journal="Physical Review Letters 115, 250401"
              doi="https://doi.org/10.1103/PhysRevLett.115.250401"
              note="Photon-based loophole-free Bell test closing the detection loophole." />
            <RefEntry n={8} authors="Shalm, L.K. et al." year={2015}
              title="Strong Loophole-Free Test of Local Realism"
              journal="Physical Review Letters 115, 250402"
              doi="https://doi.org/10.1103/PhysRevLett.115.250402"
              note="NIST loophole-free Bell test using fast quantum-random number generation." />
          </div>
        </Section>

        {/* Act 17 teaser */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-center space-y-2">
          <p className="text-[10px] font-mono text-slate-600 tracking-widest">COMING — ACT 17</p>
          <p className="text-slate-300 font-semibold">The Field</p>
          <p className="text-xs text-slate-500">
            â†|n⟩ = √(n+1)|n+1⟩ · Fock states · vacuum fluctuations · QED vertex
            · photon number as compression-state index
          </p>
          <div className="inline-block rounded-lg border border-slate-700 px-3 py-1.5 font-mono text-xs text-slate-400">
            [â, â†] = 1 · ℋ = ℏω(â†â + ½)
          </div>
        </div>

        {/* Footer AGPL-3.0 */}
        <div className="rounded-xl border px-5 py-4 space-y-2 text-[11px]"
             style={{ borderColor: ROSE + "30", background: ROSE + "06" }}>
          <p className="font-bold text-xs flex items-center gap-2" style={{ color: ROSE }}>
            <BookOpen className="w-3.5 h-3.5" /> GNU Affero General Public License v3.0
          </p>
          <p style={{ color: ROSE + "b0" }}>
            Any implementation of the entanglement swapping protocol, DLCZ Ψ-channel architecture,
            or WNSP quantum repeater topology must be released under AGPL-3.0, attribute NexusOS as
            the originating specification, and include this notice in all derivative works. The copyleft
            obligation extends to any network-accessible service — including AI training pipelines,
            quantum network simulators, and SaaS quantum computing platforms.
          </p>
          <p style={{ color: ROSE + "60" }}>
            First public disclosure: {PAGE_DATE} ·{" "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
               className="underline hover:opacity-80">
              github.com/nexusosdaily-code/NexusOS
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
