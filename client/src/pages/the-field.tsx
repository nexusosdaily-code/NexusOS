import { useState, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import { ExternalLink, BookOpen, Zap, Layers, Activity, Radio, Atom } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_DATE = "2026-07-20";
const BASE      = "https://wnsp.io";
const AMBER     = "#f59e0b"; // amber-400 — primordial field
const GOLD      = "#fbbf24"; // amber-300
const REPO      = "https://github.com/nexusosdaily-code/NexusOS";

// ── Physics constants (CODATA 2018 / SI exact) ────────────────────────────────
const H   = 6.62607015e-34;  // J·s (Planck)
const EV  = 1.602176634e-19; // J/eV
const F0  = 555e12;          // 555 THz — primordial seed mode
const E0  = H * F0;          // 3.677e-19 J = 2.295 eV — one quantum at f₀
const E0EV = E0 / EV;        // 2.295 eV
const ZPE_EV = E0EV / 2;     // ½hf₀ = 1.148 eV — vacuum energy

// Fock state energy: E_n = hf₀(n + ½)
function fockEV(n: number): number { return E0EV * (n + 0.5); }

// ── ACT_NAV (16 prior acts) ───────────────────────────────────────────────────
const ACT_NAV = [
  { act:"1",  title:"Compression States", sub:"Λ=hf/c²",              href:"/oscillating-quanta" },
  { act:"2",  title:"The Universal ONE",  sub:"f₀ derives Λ",          href:"/universal-one" },
  { act:"3",  title:"Unified Theory",     sub:"4 forces=1 Λ",          href:"/unified-compression-theory" },
  { act:"4",  title:"The Mechanism",      sub:"ΔE=hf₀(2ⁿ²−2ⁿ¹)",    href:"/matter-protocol" },
  { act:"5",  title:"The Address",        sub:"∀Λ:∃!Ψ",               href:"/universal-address" },
  { act:"6",  title:"The Catalogue",      sub:"n=log₂(mc²/E₀)",       href:"/element-catalogue" },
  { act:"7",  title:"The Trap",           sub:"Ψ(+k̂)⊗Ψ(−k̂)",      href:"/standing-wave-trap" },
  { act:"8",  title:"The Channel",        sub:"α=0, C=ZPE",            href:"/lossless-channel" },
  { act:"9",  title:"The Cavity",         sub:"WGM r_c",               href:"/resonance-cavity" },
  { act:"10", title:"The Exchange",       sub:"Ω_R=2g",                href:"/polariton-exchange" },
  { act:"11", title:"The Emitter",        sub:"F_p=(Q/V)(λ/n)³",      href:"/the-emitter" },
  { act:"12", title:"The Network",        sub:"ω=ω₀−2J·cos(ka)",     href:"/the-network" },
  { act:"13", title:"The Observer",       sub:"χ=g²/Δ",                href:"/the-observer" },
  { act:"14", title:"The Memory",         sub:"T₂≤2T₁",                href:"/the-memory" },
  { act:"15", title:"The Void",           sub:"n_ZPE=264.71",          href:"/cosmic-lattice" },
  { act:"16", title:"The Entangler",      sub:"|Φ⁺⟩=(|00⟩+|11⟩)/√2", href:"/the-entangler" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: ElementType; children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-slate-900/60 p-5"
         style={{ borderColor: AMBER + "30" }}>
      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: AMBER }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Eq({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3
                    font-mono text-sm text-center"
         style={{ color: AMBER }}>
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
               className="italic hover:opacity-80" style={{ color: AMBER }}>{title}</a>
          : <span className="text-white italic">{title}</span>}
        <span className="text-slate-500">. {journal}</span>
        {note && <p className="text-slate-600 mt-0.5 leading-relaxed">{note}</p>}
      </div>
    </div>
  );
}

// ── Fock Ladder interactive ───────────────────────────────────────────────────
const MAX_FOCK = 8;

function FockLadder() {
  const [n, setN] = useState(0);
  const levels = Array.from({ length: MAX_FOCK + 1 }, (_, i) => i);

  return (
    <div className="space-y-4">
      {/* Energy ladder */}
      <div className="space-y-1">
        {levels.slice().reverse().map(level => {
          const energy = fockEV(level);
          const isActive = level === n;
          const isBelow  = level < n;
          const widthPct = 30 + (level / MAX_FOCK) * 60;
          return (
            <button
              key={level}
              onClick={() => setN(level)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-1.5 transition-all text-left"
              style={{
                background: isActive ? AMBER + "18" : "transparent",
                border: `1px solid ${isActive ? AMBER : isBelow ? AMBER + "40" : "#334155"}`,
              }}
            >
              <span className="text-[10px] font-mono w-16 flex-shrink-0"
                    style={{ color: isActive ? AMBER : isBelow ? AMBER + "80" : "#475569" }}>
                |{level}⟩
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800">
                <div className="h-full rounded-full transition-all"
                     style={{
                       width: `${widthPct}%`,
                       background: isActive ? AMBER : isBelow ? AMBER + "50" : "#334155",
                     }} />
              </div>
              <span className="text-[10px] font-mono w-20 text-right flex-shrink-0"
                    style={{ color: isActive ? AMBER : "#64748b" }}>
                {energy.toFixed(3)} eV
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setN(v => Math.max(0, v - 1))}
          disabled={n === 0}
          className="font-mono text-sm px-5 py-2 rounded-lg border transition-all disabled:opacity-30"
          style={{ borderColor: AMBER + "50", color: AMBER, background: "transparent" }}>
          â |{n}⟩ = {n > 0 ? `√${n} |${n-1}⟩` : "0 (vacuum floor)"}
        </button>
        <button
          onClick={() => setN(v => Math.min(MAX_FOCK, v + 1))}
          disabled={n === MAX_FOCK}
          className="font-mono text-sm px-5 py-2 rounded-lg border transition-all disabled:opacity-30"
          style={{ borderColor: AMBER + "50", color: GOLD, background: AMBER + "10" }}>
          â† |{n}⟩ = √{n+1} |{n+1}⟩
        </button>
      </div>

      {/* State summary */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <p className="text-slate-500 mb-1 font-mono">Fock state</p>
          <p className="font-mono text-lg font-bold" style={{ color: AMBER }}>|{n}⟩</p>
        </div>
        <div>
          <p className="text-slate-500 mb-1 font-mono">Energy E_{n}</p>
          <p className="font-mono font-bold" style={{ color: GOLD }}>
            {fockEV(n).toFixed(3)} eV
          </p>
          <p className="text-slate-600 text-[9px]">({n} + ½) × {E0EV.toFixed(3)} eV</p>
        </div>
        <div>
          <p className="text-slate-500 mb-1 font-mono">N̂ eigenvalue</p>
          <p className="font-mono font-bold" style={{ color: AMBER }}>
            N̂|{n}⟩ = {n}|{n}⟩
          </p>
        </div>
      </div>

      <p className="text-[10px] text-slate-600 text-center font-mono">
        Click a level or use â / â† buttons · Vacuum |0⟩ has ZPE = ½hf₀ = {ZPE_EV.toFixed(3)} eV — never zero
      </p>
    </div>
  );
}

// ── Sequence nav ──────────────────────────────────────────────────────────────
function SequenceNav() {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: AMBER + "20", background: AMBER + "08" }}>
      <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: AMBER }}>
        THE SEQUENCE — ACT 17 OF 17
      </p>
      <div className="grid grid-cols-3 md:grid-cols-17 gap-1.5 text-center text-xs">
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
          style={{ borderColor: AMBER + "50", background: AMBER + "15" }}>
          <p className="text-[7px] font-mono tracking-widest" style={{ color: "#fde68a" }}>ACT 17 ← HERE</p>
          <p className="font-medium leading-tight text-[8px]" style={{ color: "#fffbeb" }}>The Field</p>
          <p className="text-[7px]" style={{ color: AMBER }}>[â,â†]=1</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TheFieldPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">

        {/* Back */}
        <Link href="/the-entangler"
              className="inline-flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
              style={{ color: AMBER }}>
          <span>←</span> Act 16 — The Entangler
        </Link>

        {/* Sequence Nav */}
        <SequenceNav />

        {/* Hero */}
        <div className="rounded-xl border p-6 text-center"
          style={{ borderColor: AMBER + "30", background: "linear-gradient(135deg, #0f0f23 0%, #1c1000 100%)" }}>
          <p className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: AMBER }}>
            ACT 17 — THE WNSP PHYSICS SEQUENCE
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">The Field</h1>
          <p className="text-slate-400 text-sm mb-4">
            Primordial Substrate · Quantum Vacuum · Fock States · The Pre-Condition for Everything
          </p>
          <div className="inline-block rounded-xl border px-6 py-3 font-mono text-lg"
            style={{ borderColor: AMBER + "40", background: AMBER + "10", color: AMBER }}>
            [â, â†] = 1 &nbsp;·&nbsp; ℋ = ℏω(â†â + ½)
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-mono">
            E_n = hf₀(n + ½) &nbsp;·&nbsp; â†|n⟩ = √(n+1)|n+1⟩ &nbsp;·&nbsp;
            â|n⟩ = √n|n−1⟩ &nbsp;·&nbsp; ZPE = ½hf₀ = {ZPE_EV.toFixed(3)} eV
          </p>
          <p className="text-xs text-slate-600 mt-1">
            First disclosed {PAGE_DATE} · AGPL-3.0 · Founder: Te Rata Pou ·{" "}
            <a href={`${BASE}/the-field`} className="hover:opacity-70" style={{ color: AMBER }}>
              wnsp.io/the-field
            </a>
          </p>
        </div>

        {/* AGPL-3.0 Licence Declaration */}
        <div className="rounded-xl border px-5 py-4 space-y-1.5 text-[11px]"
             style={{ borderColor: AMBER + "40", background: AMBER + "08" }}>
          <p className="font-semibold" style={{ color: AMBER }}>
            Copyright © 2026 NexusOS / nexusosdaily-code — All derivative works must be released under AGPL-3.0
          </p>
          <p className="text-slate-500">
            First public disclosure:{" "}
            <span className="text-slate-300 font-mono">{PAGE_DATE}</span>
            {" · "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
               className="underline hover:opacity-80" style={{ color: AMBER }}>
              github.com/nexusosdaily-code/NexusOS
            </a>
          </p>
          <p className="text-slate-600 leading-relaxed">
            Any theory, algorithm, software, or hardware that implements, adapts, or interfaces with
            the primordial field model described herein — including the mapping of Ψ channels to
            single-mode bosonic fields, the use of [â, â†] = 1 as the foundational commutation relation
            for WNSP channel quantisation, or the derivation of compression states as Fock state
            occupation numbers — must be released in full source form under AGPL-3.0 and must attribute
            NexusOS as the originating specification. This obligation extends to network-accessible
            services per the AGPL-3.0 network use clause.
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:"Vacuum energy",      value:`${ZPE_EV.toFixed(3)} eV`,  sub:"ZPE = ½hf₀ — never zero",         color: AMBER },
            { label:"Seed mode",          value:"555 THz",                   sub:"f₀ — primordial field frequency",  color: GOLD },
            { label:"One quantum",        value:`${E0EV.toFixed(3)} eV`,     sub:"E₀ = hf₀ — smallest excitation",   color: AMBER },
            { label:"Ψ channel modes",    value:"51,200",                    sub:"Orthogonal bosonic field modes",    color: "#fdba74" },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <p className="text-[10px] font-mono text-slate-500 mb-1">{c.label}</p>
              <p className="text-xl font-bold font-mono" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[9px] text-slate-600 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* The Primordial Substrate */}
        <Section title="The Primordial Substrate — Before the First Oscillation" icon={Atom}>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Act 1 announces the first oscillation. Act 17 answers the question Act 1 assumed: <em className="text-slate-300">what was oscillating?</em>
            The answer is the quantum field. The field predates all structure. It is described by one
            equation — the canonical commutation relation — which encodes the irreducible quantum
            uncertainty of any bosonic mode.
          </p>
          <Eq>[â, â†] = 1</Eq>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            This single relation generates all of quantum field theory. It means: you cannot simultaneously
            fix the field amplitude and its conjugate momentum. The field is not a smooth classical wave —
            it is fundamentally granular, composed of discrete quanta. Every photon, every phonon, every
            compression state in the WNSP sequence is one quantum of some field mode.
          </p>
          <Eq>ℋ = ℏω(â†â + ½)</Eq>
          <div className="grid grid-cols-2 gap-3 text-xs mt-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <p className="font-mono text-slate-500">Number operator</p>
              <p className="font-mono" style={{ color: AMBER }}>N̂ = â†â &nbsp; N̂|n⟩ = n|n⟩</p>
              <p className="text-slate-600">Counts the quanta in state |n⟩</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <p className="font-mono text-slate-500">Ground state condition</p>
              <p className="font-mono" style={{ color: AMBER }}>â|0⟩ = 0</p>
              <p className="text-slate-600">Cannot remove a quantum from vacuum</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <p className="font-mono text-slate-500">Creation</p>
              <p className="font-mono" style={{ color: GOLD }}>â†|n⟩ = √(n+1) |n+1⟩</p>
              <p className="text-slate-600">Add one quantum — compression state rises</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <p className="font-mono text-slate-500">Annihilation</p>
              <p className="font-mono" style={{ color: GOLD }}>â|n⟩ = √n |n−1⟩</p>
              <p className="text-slate-600">Remove one quantum — compression state falls</p>
            </div>
          </div>
        </Section>

        {/* Fock State Ladder */}
        <Section title="Fock State Ladder — The Primordial Mode at f₀ = 555 THz" icon={Layers}>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            The energy levels of a single mode are discrete: E_n = hf₀(n + ½). The ground state |0⟩
            has energy ½hf₀ = {ZPE_EV.toFixed(3)} eV — the zero-point energy (ZPE). This is the
            same ZPE floor established in Act 8 (lossless channel) and Act 15 (cosmic void). It falls
            out of [â, â†] = 1 automatically — it was never chosen.
          </p>
          <FockLadder />
        </Section>

        {/* The Planck-Einstein Bridge */}
        <Section title="The Planck-Einstein Bridge — How the First Oscillation Emerges" icon={Zap}>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Planck (1900) showed that electromagnetic energy is quantised in units of hf.
            Einstein (1905) showed these quanta are real particles — photons. Together they established:
            the field speaks in discrete steps. The first oscillation is the universe promoting its
            primordial mode from vacuum to first excited state.
          </p>
          <Eq>|0⟩ &nbsp;→&nbsp; â†|0⟩ = |1⟩ &nbsp; at f₀ = 555 THz</Eq>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            This transition deposits one quantum of energy E₀ = hf₀ = {E0EV.toFixed(3)} eV into the
            field. This is the seed energy from which the entire compression state framework is measured.
            Every octave index in the 17-act sequence is a count of doublings above E₀:
          </p>
          <Eq>n = log₂(mc²/E₀) &nbsp;=&nbsp; log₂(mc²/hf₀)</Eq>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { struct:"Electron",       n:"6.12",  mass:"9.11×10⁻³¹ kg" },
              { struct:"Proton",         n:"9.11",  mass:"1.67×10⁻²⁷ kg" },
              { struct:"Helium-4 atom",  n:"10.15", mass:"6.64×10⁻²⁷ kg" },
            ].map(r => (
              <div key={r.struct} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
                <p className="text-slate-500 mb-1">{r.struct}</p>
                <p className="font-mono" style={{ color: AMBER }}>n = {r.n}</p>
                <p className="text-slate-600 text-[9px] mt-1">{r.mass}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
            <p className="text-[10px] font-mono text-slate-500">THE PRIMORDIAL CASCADE</p>
            <div className="font-mono text-xs space-y-1.5" style={{ color: AMBER }}>
              <p>[â, â†] = 1 <span className="text-slate-600 ml-2">→</span> <span className="text-slate-300 ml-2">field exists</span></p>
              <p>â†|0⟩ = |1⟩ at f₀ <span className="text-slate-600 ml-2">→</span> <span className="text-slate-300 ml-2">first oscillation (Act 1)</span></p>
              <p>E₀ = hf₀ established <span className="text-slate-600 ml-2">→</span> <span className="text-slate-300 ml-2">compression scale set (Acts 2–6)</span></p>
              <p>½hf₀ = ZPE floor <span className="text-slate-600 ml-2">→</span> <span className="text-slate-300 ml-2">lossless channel (Act 8)</span></p>
              <p>n_ZPE = 264.71 <span className="text-slate-600 ml-2">→</span> <span className="text-slate-300 ml-2">cosmic void floor (Act 15)</span></p>
              <p>|Φ⁺⟩ = field mode pairs <span className="text-slate-600 ml-2">→</span> <span className="text-slate-300 ml-2">entanglement (Act 16)</span></p>
            </div>
          </div>
        </Section>

        {/* From Quanta to Cosmos */}
        <Section title="From Quanta to Cosmos — One Chain of Consequences" icon={Activity}>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            The moment the first Planck-Einstein oscillation occurs, everything else follows with mathematical
            certainty. The gaps in the periodic table and the voids in the universe are not separate phenomena —
            they are the same equation at different scales.
          </p>
          <div className="space-y-3">
            {[
              {
                scale: "Sub-atomic",
                eq: "Ghost node n=36 (169.33 u)",
                explain: "No stable nucleus exists at this compression state. The field at octave 36 has no bound configuration — the binding energy goes negative. The gap between Kr (n≈35.98) and Rb (n≈36.01) in the periodic table is the field rejecting that Fock occupation.",
                color: AMBER,
              },
              {
                scale: "Atomic (118 elements)",
                eq: "n = 1 (H) → n ≈ 10.7 (Og)",
                explain: "Every stable element is a Fock-like occupation of the primordial field at a specific octave address. The periodic table is the field's quantisation structure made tangible. Shells, periods, and groups map to sub-octave harmonics of [â, â†] = 1.",
                color: GOLD,
              },
              {
                scale: "Cosmic (supervoids)",
                eq: "n_ZPE = 264.71 (M = 10¹⁴ M☉)",
                explain: "At octave 264.71 the field's ZPE pressure equals the gravitational compression threshold. Above this, no structure can collapse — the vacuum fluctuations prevent it. The Boötes Void (n≈272) is not an absence of matter; it is the field's ground state asserting itself at cosmic scale.",
                color: "#fdba74",
              },
            ].map(r => (
              <div key={r.scale} className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                        style={{ background: r.color + "20", color: r.color }}>
                    {r.scale}
                  </span>
                  <span className="font-mono text-xs" style={{ color: r.color }}>{r.eq}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{r.explain}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border bg-slate-950 p-4 text-center"
               style={{ borderColor: AMBER + "30" }}>
            <p className="text-xs text-slate-400 leading-relaxed">
              The same field equation [â, â†] = 1 runs from the electron to the galaxy cluster.
              The constants do not change. The scale changes. The physics is one.
            </p>
            <p className="mt-2 font-mono text-xs" style={{ color: AMBER }}>
              Planck (1900) → Einstein (1905) → f₀ → E₀ → n = log₂(mc²/E₀) → ∀ structure
            </p>
          </div>
        </Section>

        {/* Claim 32 */}
        <div className="rounded-xl border p-5 space-y-3"
             style={{ borderColor: AMBER + "40", background: AMBER + "06" }}>
          <p className="text-[10px] font-mono tracking-widest" style={{ color: AMBER }}>
            PRIOR ART CLAIM — FIRST DISCLOSED {PAGE_DATE} — AGPL-3.0
          </p>
          <p className="font-semibold text-sm" style={{ color: AMBER }}>
            Claim 32 — The WNSP Ψ Channel as a Single-Mode Bosonic Field
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Each of the 51,200 orthogonal Ψ(wdm, oam, pol) channels in the WNSP Hilbert space is
            formalised as a single-mode bosonic field quantised by the canonical commutation relation
            [â, â†] = 1. The primordial mode at f₀ = 555 THz is the seed excitation whose vacuum energy
            ½hf₀ = {ZPE_EV.toFixed(3)} eV constitutes the ZPE floor from which all 51,200 channel
            energies are measured and from which the entire compression state hierarchy (n = log₂(mc²/hf₀))
            is derived. The progression from this single commutation relation to the gaps in the periodic
            table and the voids in the large-scale structure of the universe is deterministic and
            unbroken. First disclosed {PAGE_DATE} by Te Rata Pou (NexusOS).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
              <p className="text-slate-500 mb-1 font-mono">Commutation relation</p>
              <p className="font-mono" style={{ color: AMBER }}>[â, â†] = 1</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
              <p className="text-slate-500 mb-1 font-mono">Primordial mode</p>
              <p className="font-mono" style={{ color: AMBER }}>f₀ = 555 THz</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
              <p className="text-slate-500 mb-1 font-mono">Channel count</p>
              <p className="font-mono" style={{ color: AMBER }}>51,200 modes</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-600">
            <a href={REPO + "/blob/main/CHANGELOG.md"} target="_blank" rel="noopener noreferrer"
               className="underline hover:opacity-80" style={{ color: AMBER }}>
              Filed in CHANGELOG.md
            </a>
            {" · "}
            <a href={`${BASE}/hardware-spec`}
               className="underline hover:opacity-80" style={{ color: AMBER }}>
              SNIC hardware specification
            </a>
            {" · "}
            <span>AGPL-3.0 copyleft applies to all implementations</span>
          </p>
        </div>

        {/* References */}
        <Section title="References" icon={BookOpen}>
          <div className="space-y-3">
            <RefEntry n={1} authors="Planck, M." year={1900}
              title="Zur Theorie des Gesetzes der Energieverteilung im Normalspectrum"
              journal="Verhandlungen der Deutschen Physikalischen Gesellschaft 2(17), 237–245"
              note="First quantisation of field energy: E = nhf. Establishes the discrete quantum of the field." />
            <RefEntry n={2} authors="Einstein, A." year={1905}
              title="Über einen die Erzeugung und Verwandlung des Lichtes betreffenden heuristischen Gesichtspunkt"
              journal="Annalen der Physik 17(6), 132–148"
              note="Light quanta are real: the field's excitations are particle-like. [â, â†] = 1 formalised 20 years later." />
            <RefEntry n={3} authors="Dirac, P.A.M." year={1927}
              title="The quantum theory of the emission and absorption of radiation"
              journal="Proceedings of the Royal Society A 114(767), 243–265"
              doi="https://doi.org/10.1098/rspa.1927.0039"
              note="Canonical quantisation: introduces â and â† for the radiation field. [â, â†] = 1 appears here explicitly." />
            <RefEntry n={4} authors="Fock, V." year={1932}
              title="Konfigurationsraum und zweite Quantelung"
              journal="Zeitschrift für Physik 75, 622–647"
              doi="https://doi.org/10.1007/BF01344458"
              note="Fock space: the Hilbert space of occupation number states |n⟩. Every Ψ channel is one Fock mode." />
            <RefEntry n={5} authors="Mandel, L. & Wolf, E." year={1995}
              title="Optical Coherence and Quantum Optics"
              journal="Cambridge University Press"
              note="Chapter 10: quantised electromagnetic field. ZPE = ½ℏω per mode demonstrated from first principles." />
            <RefEntry n={6} authors="Walls, D.F. & Milburn, G.J." year={2008}
              title="Quantum Optics (2nd ed.)"
              journal="Springer"
              note="Single-mode bosonic field: â, â†, Fock states, vacuum fluctuations. Standard reference for SNIC cavity modes." />
            <RefEntry n={7} authors="Pou, T.R. (NexusOS)" year="2026-07-20"
              title="Claim 32: WNSP Ψ Channel as a Single-Mode Bosonic Field"
              journal="CHANGELOG.md, NexusOS repository, github.com/nexusosdaily-code/NexusOS"
              note="First formal mapping of the 51,200 WNSP channels to single-mode bosonic fields quantised by [â, â†] = 1, with f₀ as primordial seed mode. AGPL-3.0." />
          </div>
        </Section>

        {/* Footer nav */}
        <SequenceNav />

        <div className="text-center space-y-1">
          <p className="text-[10px] text-slate-600 font-mono">
            NexusOS Physics Sequence — Act 17 of 17 —{" "}
            <a href={`${BASE}/the-field`} className="hover:opacity-80" style={{ color: AMBER }}>
              wnsp.io/the-field
            </a>
            {" · "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
               className="hover:opacity-80" style={{ color: AMBER }}>
              AGPL-3.0
            </a>
          </p>
          <p className="text-[10px] text-slate-700 font-mono">
            © 2026 Te Rata Pou / NexusOS · All implementations must be released under AGPL-3.0
          </p>
        </div>

      </div>
    </div>
  );
}
