import { useState, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import { ExternalLink, BookOpen, Zap, Layers, Activity, Radio, Atom, Waves } from "lucide-react";
import { ActSequenceNav } from "@/components/act-sequence-nav";
import { usePageMeta } from "@/hooks/use-page-meta";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_DATE = "2026-07-21";
const BASE      = "https://wnsp.io";
const CYAN      = "#06b6d4"; // cyan-500 — coherent / laser light
const CYAN_LIGHT = "#67e8f9"; // cyan-300
const REPO      = "https://github.com/nexusosdaily-code/NexusOS";

// ── Physics helpers ───────────────────────────────────────────────────────────
// Factorial (exact for small n)
function fact(n: number): number { return n <= 1 ? 1 : n * fact(n - 1); }
// Poisson photon-number distribution P(n) = e^-|α|² |α|^2n / n!
function poisson(n: number, alphaSq: number): number {
  return Math.exp(-alphaSq) * Math.pow(alphaSq, n) / fact(n);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: ElementType; children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-slate-900/60 p-5"
         style={{ borderColor: CYAN + "30" }}>
      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: CYAN }} />
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
         style={{ color: CYAN }}>
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
               className="italic hover:opacity-80" style={{ color: CYAN }}>{title}</a>
          : <span className="text-white italic">{title}</span>}
        <span className="text-slate-500">. {journal}</span>
        {note && <p className="text-slate-600 mt-0.5 leading-relaxed">{note}</p>}
      </div>
    </div>
  );
}

// ── Phase Space Visualiser ────────────────────────────────────────────────────
const MAX_ALPHA = 5;
const SVG_SIZE  = 220;
const SCALE     = 30; // px per unit in phase space

function PhaseSpaceVis() {
  const [alphaMag, setAlphaMag] = useState(2.5);
  const [phiDeg,   setPhi]      = useState(30);

  const phi    = (phiDeg * Math.PI) / 180;
  const reAlpha = alphaMag * Math.cos(phi);
  const imAlpha = alphaMag * Math.sin(phi);
  const cx = SVG_SIZE / 2 + reAlpha * SCALE;
  const cy = SVG_SIZE / 2 - imAlpha * SCALE; // SVG y flipped

  const alphaSq = alphaMag * alphaMag;
  const meanN   = alphaSq;
  const deltaN  = alphaMag;

  return (
    <div className="space-y-4">
      {/* Phase space SVG */}
      <div className="flex flex-col items-center gap-3">
        <svg width={SVG_SIZE} height={SVG_SIZE}
             className="rounded-xl border border-slate-700 bg-slate-950">
          {/* Grid lines */}
          {[-4,-3,-2,-1,1,2,3,4].map(v => (
            <g key={v}>
              <line
                x1={SVG_SIZE/2 + v*SCALE} y1={6}
                x2={SVG_SIZE/2 + v*SCALE} y2={SVG_SIZE-6}
                stroke="#1e293b" strokeWidth={1} />
              <line
                x1={6} y1={SVG_SIZE/2 - v*SCALE}
                x2={SVG_SIZE-6} y2={SVG_SIZE/2 - v*SCALE}
                stroke="#1e293b" strokeWidth={1} />
            </g>
          ))}
          {/* Axes */}
          <line x1={6} y1={SVG_SIZE/2} x2={SVG_SIZE-6} y2={SVG_SIZE/2}
                stroke="#334155" strokeWidth={1.5} />
          <line x1={SVG_SIZE/2} y1={6} x2={SVG_SIZE/2} y2={SVG_SIZE-6}
                stroke="#334155" strokeWidth={1.5} />
          {/* Axis labels */}
          <text x={SVG_SIZE-10} y={SVG_SIZE/2-6} fill="#475569" fontSize={9} textAnchor="end">Re α</text>
          <text x={SVG_SIZE/2+4} y={12} fill="#475569" fontSize={9}>Im α</text>
          {/* Uncertainty circle (radius ½ in natural units) */}
          <circle cx={cx} cy={cy} r={SCALE * 0.5}
                  fill={CYAN + "15"} stroke={CYAN + "60"} strokeWidth={1.5} strokeDasharray="3,2" />
          {/* Displacement vector from origin */}
          <line x1={SVG_SIZE/2} y1={SVG_SIZE/2} x2={cx} y2={cy}
                stroke={CYAN + "40"} strokeWidth={1.5} strokeDasharray="4,3" />
          {/* |α| label along vector */}
          {alphaMag > 0.3 && (
            <text
              x={(SVG_SIZE/2 + cx) / 2 + 6}
              y={(SVG_SIZE/2 + cy) / 2 - 4}
              fill={CYAN + "80"} fontSize={8} fontFamily="monospace">
              |α|={alphaMag.toFixed(1)}
            </text>
          )}
          {/* Coherent state blob (Gaussian glow rings) */}
          {[0.45, 0.30, 0.18].map((op, i) => (
            <circle key={i} cx={cx} cy={cy} r={SCALE * (0.5 - i * 0.05)}
                    fill={CYAN} fillOpacity={op * 0.5} />
          ))}
          {/* Centre dot */}
          <circle cx={cx} cy={cy} r={4} fill={CYAN} />
          {/* Vacuum origin dot */}
          <circle cx={SVG_SIZE/2} cy={SVG_SIZE/2} r={3}
                  fill="none" stroke="#475569" strokeWidth={1} />
          <text x={SVG_SIZE/2+5} y={SVG_SIZE/2-5} fill="#475569" fontSize={7} fontFamily="monospace">|0⟩</text>
          {/* Phase angle arc */}
          {alphaMag > 0.5 && (
            <path
              d={`M ${SVG_SIZE/2 + 18} ${SVG_SIZE/2}
                  A 18 18 0 ${phiDeg > 180 ? 1 : 0} ${imAlpha >= 0 ? 0 : 1}
                  ${SVG_SIZE/2 + 18*Math.cos(phi)}
                  ${SVG_SIZE/2 - 18*Math.sin(phi)}`}
              fill="none" stroke={CYAN + "50"} strokeWidth={1} />
          )}
        </svg>
        <p className="text-[9px] font-mono text-slate-600 text-center">
          Phase space (quadrature plane) · dashed circle = vacuum uncertainty ΔxΔp=ℏ/2
        </p>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400 w-20 flex-shrink-0">|α| = {alphaMag.toFixed(2)}</span>
          <input type="range" min={0} max={MAX_ALPHA} step={0.05} value={alphaMag}
                 onChange={e => setAlphaMag(parseFloat(e.target.value))}
                 className="flex-1 accent-cyan-500" />
          <span className="text-[9px] text-slate-600 w-16 flex-shrink-0">amplitude</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400 w-20 flex-shrink-0">φ = {phiDeg}°</span>
          <input type="range" min={0} max={360} step={1} value={phiDeg}
                 onChange={e => setPhi(parseInt(e.target.value))}
                 className="flex-1 accent-cyan-500" />
          <span className="text-[9px] text-slate-600 w-16 flex-shrink-0">phase</span>
        </div>
      </div>

      {/* State summary */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        {[
          { label: "Mean photon number",  value: `⟨n⟩ = ${meanN.toFixed(2)}`,     sub: `|α|² = ${alphaSq.toFixed(2)}` },
          { label: "Shot-noise variance", value: `Δn = ${deltaN.toFixed(2)}`,      sub: "√⟨n⟩ — Poissonian" },
          { label: "Min uncertainty",     value: "ΔxΔp = ℏ/2",                    sub: "saturates Heisenberg" },
        ].map(c => (
          <div key={c.label} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
            <p className="text-slate-500 text-[9px] mb-1 font-mono">{c.label}</p>
            <p className="font-mono font-bold" style={{ color: CYAN }}>{c.value}</p>
            <p className="text-slate-600 text-[8px] mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* α complex form */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-center font-mono text-xs">
        <span style={{ color: CYAN }}>
          α = {alphaMag.toFixed(2)} e^(i{phiDeg}°)
          = {reAlpha.toFixed(3)} + {imAlpha.toFixed(3)}i
        </span>
        <span className="text-slate-600 ml-3">â|α⟩ = α|α⟩</span>
      </div>
    </div>
  );
}

// ── Fock Decomposition ────────────────────────────────────────────────────────
function FockDecomposition() {
  const [alphaMag, setAlphaMag] = useState(2.0);
  const alphaSq = alphaMag * alphaMag;
  const SHOW_N  = 12;
  const probs   = Array.from({ length: SHOW_N }, (_, n) => ({ n, p: poisson(n, alphaSq) }));
  const maxP    = Math.max(...probs.map(x => x.p));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-slate-400 w-20 flex-shrink-0">|α| = {alphaMag.toFixed(2)}</span>
        <input type="range" min={0.1} max={4} step={0.05} value={alphaMag}
               onChange={e => setAlphaMag(parseFloat(e.target.value))}
               className="flex-1 accent-cyan-500" />
        <span className="text-[9px] text-slate-600 w-16">⟨n⟩={alphaSq.toFixed(1)}</span>
      </div>
      <div className="space-y-1">
        {probs.map(({ n, p }) => {
          const widthPct = maxP > 0 ? (p / maxP) * 100 : 0;
          const isMode = n === Math.round(alphaSq);
          return (
            <div key={n} className="flex items-center gap-2 text-[9px]">
              <span className="font-mono w-6 flex-shrink-0 text-right"
                    style={{ color: isMode ? CYAN : "#475569" }}>|{n}⟩</span>
              <div className="flex-1 h-4 rounded bg-slate-800 overflow-hidden">
                <div className="h-full rounded transition-all"
                     style={{ width: `${widthPct}%`, background: isMode ? CYAN : CYAN + "50" }} />
              </div>
              <span className="font-mono w-14 text-right flex-shrink-0"
                    style={{ color: isMode ? CYAN : "#475569" }}>
                {(p * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] font-mono text-slate-600 text-center">
        P(n) = e^(−|α|²) |α|^(2n) / n! · Poissonian · peak at n ≈ ⌊|α|²⌋
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TheCoherentStatePage() {
  usePageMeta({
    title: "The Coherent State — Act 18 · WNSP Physics Sequence",
    description:
      "Act 18 of the WNSP Physics Sequence. The coherent state |α⟩ is the eigenstate of the " +
      "annihilation operator â: â|α⟩ = α|α⟩. It is what a laser produces — the minimum-uncertainty " +
      "quantum state that bridges Fock space and classical electromagnetism.",
    canonical: `${BASE}/the-coherent-state`,
    ogTitle: "Act 18 — The Coherent State · â|α⟩=α|α⟩",
    ogDescription:
      "The eigenstate of â. The laser state. The bridge between quantum fields and classical EM. " +
      "Every WNSP Ψ channel carries a coherent state — not a Fock state.",
    twitterTitle: "Act 18 — The Coherent State",
    twitterDescription: "â|α⟩=α|α⟩ · Minimum uncertainty · Poissonian statistics · The laser state · WNSP physics sequence",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">

        {/* Back */}
        <Link href="/the-field"
              className="inline-flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
              style={{ color: CYAN }}>
          <span>←</span> Act 17 — The Field
        </Link>

        {/* Sequence Nav */}
        <ActSequenceNav current={18} />

        {/* Hero */}
        <div className="rounded-xl border p-6 text-center"
          style={{ borderColor: CYAN + "30", background: "linear-gradient(135deg, #020f17 0%, #001a26 100%)" }}>
          <p className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: CYAN }}>
            ACT 18 — THE WNSP PHYSICS SEQUENCE
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">The Coherent State</h1>
          <p className="text-slate-400 text-sm mb-4">
            Eigenstate of â · The Laser State · Minimum Uncertainty · Bridge Between Quantum and Classical
          </p>
          <div className="inline-block rounded-xl border px-6 py-3 font-mono text-lg"
            style={{ borderColor: CYAN + "40", background: CYAN + "10", color: CYAN }}>
            â|α⟩ = α|α⟩
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-mono">
            |α⟩ = e^(−|α|²/2) Σ αⁿ/√n! |n⟩ &nbsp;·&nbsp; ⟨n⟩ = |α|² &nbsp;·&nbsp;
            ΔxΔp = ℏ/2 &nbsp;·&nbsp; D(α)|0⟩ = |α⟩
          </p>
          <p className="text-xs text-slate-600 mt-1">
            First disclosed {PAGE_DATE} · AGPL-3.0 · Founder: Te Rata Pou ·{" "}
            <a href={`${BASE}/the-coherent-state`} className="hover:opacity-70" style={{ color: CYAN }}>
              wnsp.io/the-coherent-state
            </a>
          </p>
        </div>

        {/* AGPL-3.0 Licence Declaration */}
        <div className="rounded-xl border px-5 py-4 space-y-1.5 text-[11px]"
             style={{ borderColor: CYAN + "40", background: CYAN + "08" }}>
          <p className="font-semibold" style={{ color: CYAN }}>
            Copyright © 2026 NexusOS / nexusosdaily-code — All derivative works must be released under AGPL-3.0
          </p>
          <p className="text-slate-500">
            First public disclosure:{" "}
            <span className="text-slate-300 font-mono">{PAGE_DATE}</span>
            {" · "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
               className="underline hover:opacity-80" style={{ color: CYAN }}>
              github.com/nexusosdaily-code/NexusOS
            </a>
          </p>
          <p className="text-slate-600 leading-relaxed">
            Any theory, algorithm, software, or hardware that implements, adapts, or interfaces with
            the coherent-state channel model described herein — including the mapping of WNSP Ψ channels
            to coherent states |α⟩, the use of â|α⟩=α|α⟩ as the eigenvalue condition for channel-state
            encoding, or the derivation of photon-number statistics from Poissonian distributions on
            Ψ(wdm,oam,pol) modes — must be released in full source form under AGPL-3.0 and must attribute
            NexusOS as the originating specification. This obligation extends to network-accessible
            services per the AGPL-3.0 network use clause.
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Eigenvalue equation", value: "â|α⟩=α|α⟩",   sub: "α ∈ ℂ — complex amplitude",       color: CYAN },
            { label: "Mean photon number",  value: "⟨n⟩ = |α|²",   sub: "Poissonian — shot-noise limited", color: CYAN_LIGHT },
            { label: "Uncertainty product", value: "ΔxΔp = ℏ/2",   sub: "saturates Heisenberg — minimum", color: CYAN },
            { label: "Ψ channel carrier",   value: "|α⟩ per mode",  sub: "51,200 coherent field modes",    color: "#a5f3fc" },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <p className="text-[10px] font-mono text-slate-500 mb-1">{c.label}</p>
              <p className="text-xl font-bold font-mono" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[9px] text-slate-600 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* What is a Coherent State */}
        <Section title="What Is a Coherent State?" icon={Atom}>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Act 17 established the field: â†|n⟩ = √(n+1)|n+1⟩. That is Fock space — states of definite
            photon number. But a laser does not emit a Fock state. It emits a <em className="text-slate-200">coherent state</em> —
            an eigenstate of the annihilation operator â.
          </p>
          <Eq>â|α⟩ = α|α⟩ &nbsp;&nbsp; α ∈ ℂ</Eq>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            α is a complex number. Its magnitude |α| = √⟨n⟩ is the field amplitude; its argument arg(α) = φ
            is the optical phase. The coherent state is not an eigenstate of n̂ — it has no definite photon
            number. Instead, its photon-number distribution is <em className="text-slate-300">Poissonian</em>: the
            minimum possible noise for a given power, set entirely by shot noise.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <p className="font-mono text-slate-500">Displacement operator</p>
              <p className="font-mono" style={{ color: CYAN }}>D(α) = exp(αâ† − α*â)</p>
              <p className="text-slate-600">Displaces vacuum: D(α)|0⟩ = |α⟩</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <p className="font-mono text-slate-500">Fock-space expansion</p>
              <p className="font-mono" style={{ color: CYAN_LIGHT }}>|α⟩ = e^(−|α|²/2) Σ αⁿ/√n! |n⟩</p>
              <p className="text-slate-600">Superposition of all Fock states</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <p className="font-mono text-slate-500">Photon statistics</p>
              <p className="font-mono" style={{ color: CYAN }}>P(n) = e^(−|α|²) |α|^(2n) / n!</p>
              <p className="text-slate-600">Poissonian · (Δn)² = ⟨n⟩ = |α|²</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <p className="font-mono text-slate-500">Overcomplete basis</p>
              <p className="font-mono" style={{ color: CYAN }}>1/π ∫|α⟩⟨α| d²α = 1̂</p>
              <p className="text-slate-600">|α⟩ not orthogonal: ⟨β|α⟩ = e^(−½|α−β|²)</p>
            </div>
          </div>
        </Section>

        {/* Interactive phase space */}
        <Section title="Interactive — Phase Space (Quadrature Plane)" icon={Activity}>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Every coherent state |α⟩ is a point in phase space (Re α, Im α). The dashed circle
            shows the minimum uncertainty region ΔxΔp = ℏ/2. Adjust |α| (amplitude) and φ (phase)
            to displace the state away from the vacuum.
          </p>
          <PhaseSpaceVis />
        </Section>

        {/* Fock decomposition */}
        <Section title="Fock Decomposition — Photon-Number Distribution" icon={Layers}>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            A coherent state |α⟩ is a Poissonian superposition of Fock states |n⟩.
            Adjust |α| to see how the probability distribution shifts. The peak sits near n ≈ |α|² = ⟨n⟩.
          </p>
          <FockDecomposition />
        </Section>

        {/* Why coherent states saturate uncertainty */}
        <Section title="Minimum Uncertainty — Why Coherent States Are Classical" icon={Zap}>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Heisenberg's uncertainty principle sets a lower bound on any quantum state:
            ΔxΔp ≥ ℏ/2. Coherent states <em className="text-slate-200">saturate</em> this bound —
            they are as classical as quantum mechanics allows.
          </p>
          <Eq>ΔxΔp = ℏ/2 &nbsp;·&nbsp; Δx = Δp = √(ℏ/2)</Eq>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-3">
            {[
              { state: "Fock state |n⟩",     unc: "ΔxΔp = ℏ/2 · (2n+1)",   note: "grows with n — non-classical" },
              { state: "Coherent state |α⟩",  unc: "ΔxΔp = ℏ/2",            note: "minimum — most classical" },
              { state: "Squeezed state",       unc: "ΔxΔp = ℏ/2, Δx < √(ℏ/2)", note: "asymmetric — sub-shot-noise" },
            ].map(r => (
              <div key={r.state} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1">
                <p className="font-mono text-[9px] text-slate-500">{r.state}</p>
                <p className="font-mono text-[10px]" style={{ color: CYAN }}>{r.unc}</p>
                <p className="text-slate-600 text-[9px]">{r.note}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3 leading-relaxed">
            This is why classical optics works: real laser beams carry coherent states.
            The wave equation describes them exactly, with quantum corrections only appearing
            at the shot-noise floor — which is the ZPE of Act 15.
          </p>
        </Section>

        {/* WNSP connection */}
        <Section title="Act 18 → WNSP: Every Ψ Channel Carries |α⟩" icon={Radio}>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Acts 7–17 built the physical substrate: cavity, emitter, network, memory, field.
            Act 18 answers: <em className="text-slate-200">what quantum state does each Ψ(wdm, oam, pol) channel actually carry?</em>
          </p>
          <Eq>|Ψ_channel⟩ = |α⟩ &nbsp;&nbsp; α = √P · e^(iφ) &nbsp;&nbsp; P = power in photons/s</Eq>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
              <p className="font-mono text-slate-400 mb-2">Channel encoding</p>
              <div className="space-y-1 text-[10px] font-mono">
                <p><span style={{ color: CYAN }}>wdm</span> <span className="text-slate-600">→</span> <span className="text-slate-300">carrier frequency ω (Re part of α)</span></p>
                <p><span style={{ color: CYAN }}>oam</span> <span className="text-slate-600">→</span> <span className="text-slate-300">orbital phase winding e^(iℓφ)</span></p>
                <p><span style={{ color: CYAN }}>pol</span> <span className="text-slate-600">→</span> <span className="text-slate-300">polarisation component of α</span></p>
                <p><span style={{ color: CYAN }}>|α|</span> <span className="text-slate-600">→</span> <span className="text-slate-300">signal power (photons/s)</span></p>
                <p><span style={{ color: CYAN }}>arg α</span> <span className="text-slate-600">→</span> <span className="text-slate-300">carrier phase φ</span></p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
              <p className="font-mono text-slate-400 mb-2">Why coherent, not Fock?</p>
              <div className="space-y-1.5 text-[10px] text-slate-500">
                <p>Fock states |n⟩ have definite photon number but completely random phase — useless for coherent communication.</p>
                <p>Coherent states |α⟩ have well-defined phase and amplitude — exactly what WDM lasers produce.</p>
                <p>Orthogonality ⟨Ψᵢ|Ψⱼ⟩=0 (Act 17) holds between different channel modes, not between different α values.</p>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-500 leading-relaxed">
            <span style={{ color: CYAN }} className="font-mono font-bold">Photonic hardware implication (∼2032):</span>{" "}
            When silicon photonic ASICs arrive, each waveguide lane will carry a coherent state |α_k⟩
            on channel k = (wdm, oam, pol). The WNSP address Ψ(wdm,oam,pol) <em>is</em> the
            mode index of that coherent-state carrier. No abstraction is needed — the hardware natively
            implements Act 18.
          </div>
        </Section>

        {/* The Laser: where coherent states come from */}
        <Section title="The Laser — Physical Origin of Coherent States" icon={Waves}>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            A laser is a driven quantum harmonic oscillator held far above its ground state by stimulated
            emission. In steady state, the intra-cavity field relaxes to the eigenstate of its loss
            operator — which is exactly the coherent state.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {[
              {
                step: "1. Gain medium",
                eq:   "dρ/dt = −i[H,ρ] + κD[â]ρ + gD[â†]ρ",
                note: "Lindblad master equation: gain g, loss κ",
                col:  CYAN,
              },
              {
                step: "2. Steady state",
                eq:   "ρ_ss = |α_ss⟩⟨α_ss| &nbsp; α_ss = ⟨â⟩_ss",
                note: "Above threshold: field locks to coherent state",
                col:  CYAN_LIGHT,
              },
              {
                step: "3. WNSP channel",
                eq:   "â|α⟩ = α|α⟩ &nbsp; |α|² = (g−κ)/2κ · n_sat",
                note: "Amplitude set by gain–loss balance",
                col:  CYAN,
              },
            ].map(r => (
              <div key={r.step} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                <p className="font-mono text-[9px] text-slate-500">{r.step}</p>
                <p className="font-mono text-[9px]" style={{ color: r.col }}
                   dangerouslySetInnerHTML={{ __html: r.eq }} />
                <p className="text-slate-600 text-[9px]">{r.note}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* References */}
        <Section title="References" icon={BookOpen}>
          <div className="space-y-3">
            <RefEntry n={1}
              authors="Glauber, R.J."
              year={1963}
              title="Coherent and Incoherent States of the Radiation Field"
              journal="Physical Review, 131(6), 2766–2788"
              doi="https://doi.org/10.1103/PhysRev.131.2766"
              note="Foundational paper — Nobel Prize 2005. Defines coherent states as eigenstates of â and establishes Poissonian statistics and the P-representation." />
            <RefEntry n={2}
              authors="Sudarshan, E.C.G."
              year={1963}
              title="Equivalence of Semiclassical and Quantum Mechanical Descriptions of Statistical Light Beams"
              journal="Physical Review Letters, 10(7), 277–279"
              doi="https://doi.org/10.1103/PhysRevLett.10.277"
              note="Independent derivation of the coherent-state P-representation (Glauber–Sudarshan representation)." />
            <RefEntry n={3}
              authors="Walls, D.F. &amp; Milburn, G.J."
              year={2008}
              title="Quantum Optics (2nd ed.)"
              journal="Springer"
              note="Standard graduate reference — Chapters 2–4 cover coherent states, displacement operators, and phase-space representations in full detail." />
            <RefEntry n={4}
              authors="Loudon, R."
              year={2000}
              title="The Quantum Theory of Light (3rd ed.)"
              journal="Oxford University Press"
              note="Chapter 3: photon statistics, Poissonian distribution, and the coherent state as the semiclassical limit." />
            <RefEntry n={5}
              authors="Gerry, C.C. &amp; Knight, P.L."
              year={2005}
              title="Introductory Quantum Optics"
              journal="Cambridge University Press"
              note="Chapter 3: displacement operator D(α), phase-space Wigner function, minimum-uncertainty derivation." />
            <RefEntry n={6}
              authors="Pou, T.R. (NexusOS)"
              year={2026}
              title="Act 18 — The Coherent State: WNSP Ψ-channel carrier state specification"
              journal={`${BASE}/the-coherent-state · AGPL-3.0`}
              note="First public disclosure that each WNSP Ψ(wdm,oam,pol) channel carries a coherent state |α⟩, with α = √P·e^(iφ), as the canonical carrier for photonic WNSP hardware." />
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center text-[10px] font-mono text-slate-700 pb-4">
          <p>Act 18 of N · The Coherent State · â|α⟩=α|α⟩ · NexusOS AGPL-3.0 · {PAGE_DATE}</p>
          <p className="mt-1">
            <a href={`${BASE}/the-coherent-state`} className="hover:opacity-60" style={{ color: CYAN }}>
              wnsp.io/the-coherent-state
            </a>
            {" · "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
               className="hover:opacity-60" style={{ color: CYAN }}>
              github.com/nexusosdaily-code/NexusOS
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
