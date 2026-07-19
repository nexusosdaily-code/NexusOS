import { useState, useEffect, useRef, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Waves, Activity, Radio, Layers, Network, Zap, GitBranch, BarChart2 } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const PAGE_DATE = "2026-07-19";
const BASE      = "https://wnsp.io";
const TEAL      = "#14b8a6";

// ── Tight-binding dispersion ─────────────────────────────────────────────────
function dispersion(ka: number, J: number, omega0 = 1): number {
  return omega0 - 2 * J * Math.cos(ka);
}
function groupVelocity(ka: number, J: number, a = 1): number {
  return 2 * J * a * Math.sin(ka);   // ℏ = 1 units
}

// ── RK4 tight-binding dynamics: iℏ dψₙ/dt = -J(ψₙ₋₁ + ψₙ₊₁) ─────────────
type Cplx = { re: number; im: number };
function addC(a: Cplx, b: Cplx): Cplx { return { re: a.re + b.re, im: a.im + b.im }; }
function scaleC(s: number, a: Cplx): Cplx { return { re: s * a.re, im: s * a.im }; }
function mulI(a: Cplx): Cplx { return { re: -a.im, im: a.re }; }   // multiply by i

function tbDeriv(psi: Cplx[], J: number): Cplx[] {
  const N = psi.length;
  return psi.map((_, n) => {
    const left  = n > 0     ? psi[n-1] : { re: 0, im: 0 };
    const right = n < N - 1 ? psi[n+1] : { re: 0, im: 0 };
    const hop   = addC(left, right);
    // iℏ dψ/dt = -J(hop) → dψ/dt = iJ(hop) = i·J·hop
    return mulI(scaleC(J, hop));
  });
}

function rk4Step(psi: Cplx[], J: number, dt: number): Cplx[] {
  const N = psi.length;
  const k1 = tbDeriv(psi, J);
  const psi2 = psi.map((p, n) => addC(p, scaleC(dt/2, k1[n])));
  const k2 = tbDeriv(psi2, J);
  const psi3 = psi.map((p, n) => addC(p, scaleC(dt/2, k2[n])));
  const k3 = tbDeriv(psi3, J);
  const psi4 = psi.map((p, n) => addC(p, scaleC(dt, k3[n])));
  const k4 = tbDeriv(psi4, J);
  return psi.map((p, n) =>
    addC(p, scaleC(dt/6, addC(addC(addC(k1[n], scaleC(2, k2[n])), scaleC(2, k3[n])), k4[n])))
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color = TEAL, children }: {
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

function Ref({ n, authors, year, title, journal, doi, note }: {
  n: number; authors: string; year: number | string; title: string;
  journal: string; doi?: string; note?: string;
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-slate-500 font-mono w-5 flex-shrink-0">[{n}]</span>
      <div>
        <span className="text-slate-400">{authors} ({year}). </span>
        {doi
          ? <a href={doi} target="_blank" rel="noopener noreferrer"
               className="hover:opacity-80 italic" style={{ color: TEAL }}>{title}</a>
          : <span className="text-white italic">{title}</span>}
        <span className="text-slate-500">. {journal}</span>
        {note && <p className="text-slate-600 mt-0.5 leading-relaxed">{note}</p>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: color + "40", background: color + "10" }}>
      <p className="text-xs mb-2" style={{ color }}>{label}</p>
      <p className="text-xl font-bold font-mono text-white">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

const ACT_NAV = [
  { act:"1",  title:"Compression States", sub:"Λ=hf/c²",          href:"/oscillating-quanta" },
  { act:"2",  title:"The Universal ONE",  sub:"f₀ derives Λ",      href:"/universal-one" },
  { act:"3",  title:"Unified Theory",     sub:"4 forces=1 Λ",      href:"/unified-compression-theory" },
  { act:"4",  title:"The Mechanism",      sub:"ΔE=hf₀(2ⁿ²−2ⁿ¹)", href:"/matter-protocol" },
  { act:"5",  title:"The Address",        sub:"∀Λ:∃!Ψ",            href:"/universal-address" },
  { act:"6",  title:"The Catalogue",      sub:"n=log₂(mc²/E₀)",   href:"/element-catalogue" },
  { act:"7",  title:"The Trap",           sub:"Ψ(+k̂)⊗Ψ(−k̂)",   href:"/standing-wave-trap" },
  { act:"8",  title:"The Channel",        sub:"α=0, C=ZPE",        href:"/lossless-channel" },
  { act:"9",  title:"The Cavity",         sub:"R=nc/2πfₙ",         href:"/resonance-cavity" },
  { act:"10", title:"The Exchange",       sub:"Ω_R=2g",            href:"/polariton-exchange" },
  { act:"11", title:"The Emitter",        sub:"F_p=(Q/V)(λ/n)³",  href:"/the-emitter" },
];

function SequenceNav({ current }: { current: 12 }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: TEAL + "20", background: TEAL + "08" }}>
      <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: TEAL }}>
        THE SEQUENCE — ACT {current} OF 13
      </p>
      <div className="grid grid-cols-3 md:grid-cols-13 gap-1.5 text-center text-xs">
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
          style={{ borderColor: TEAL + "50", background: TEAL + "15" }}>
          <p className="text-[7px] font-mono tracking-widest" style={{ color: "#5eead4" }}>ACT 12 ← HERE</p>
          <p className="font-medium leading-tight text-[8px]" style={{ color: "#ccfbf1" }}>The Network</p>
          <p className="text-[7px]" style={{ color: TEAL }}>ω=ω₀−2J·cos(ka)</p>
        </div>
        <Link href="/the-observer"
              className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-1.5
                         hover:border-orange-400/60 transition-colors space-y-0.5 block">
          <p className="text-[7px] font-mono text-orange-400 tracking-widest">ACT 13 →</p>
          <p className="text-orange-200 font-medium leading-tight text-[8px]">The Observer</p>
          <p className="text-[7px] text-orange-400">χ=g²/Δ</p>
        </Link>
      </div>
    </div>
  );
}

// ── Band-structure SVG ───────────────────────────────────────────────────────
function BandStructure({ J }: { J: number }) {
  const W = 280; const H = 160;
  const pad = { l: 36, r: 10, t: 10, b: 28 };
  const inner = { w: W - pad.l - pad.r, h: H - pad.t - pad.b };
  const N = 120;
  const omegas = Array.from({ length: N }, (_, i) => {
    const ka = -Math.PI + (2 * Math.PI * i) / (N - 1);
    return dispersion(ka, J);
  });
  const omMin = Math.min(...omegas); const omMax = Math.max(...omegas);
  const range = omMax - omMin || 0.001;
  const toX = (i: number) => pad.l + (i / (N - 1)) * inner.w;
  const toY = (om: number) => pad.t + inner.h - ((om - omMin) / range) * inner.h;
  const pts = omegas.map((om, i) => `${toX(i)},${toY(om)}`).join(" ");
  const kaLabels = ["-π", "-π/2", "0", "+π/2", "+π"];
  const omLabels = [omMin.toFixed(3), ((omMin + omMax) / 2).toFixed(3), omMax.toFixed(3)];
  return (
    <svg width={W} height={H} className="w-full max-w-sm mx-auto">
      <rect width={W} height={H} rx="8" fill="#0f172a" />
      {omLabels.map((l, i) => {
        const y = pad.t + inner.h - (i / 2) * inner.h;
        return (
          <g key={l}>
            <line x1={pad.l} y1={y} x2={pad.l + inner.w} y2={y}
              stroke="#1e293b" strokeWidth="0.5" />
            <text x={pad.l - 3} y={y + 3} textAnchor="end"
              fontSize="7" fill="#475569" fontFamily="monospace">{l}</text>
          </g>
        );
      })}
      {kaLabels.map((l, i) => {
        const x = pad.l + (i / 4) * inner.w;
        return (
          <g key={l}>
            <line x1={x} y1={pad.t} x2={x} y2={pad.t + inner.h}
              stroke="#1e293b" strokeWidth="0.5" />
            <text x={x} y={H - 6} textAnchor="middle"
              fontSize="7" fill="#475569" fontFamily="monospace">{l}</text>
          </g>
        );
      })}
      <polyline points={pts} fill="none" stroke={TEAL} strokeWidth="2" />
      <text x={pad.l + inner.w / 2} y={H - 1} textAnchor="middle"
        fontSize="7.5" fill="#64748b" fontFamily="monospace">k·a</text>
      <text x={8} y={pad.t + inner.h / 2} textAnchor="middle"
        fontSize="7.5" fill="#64748b" fontFamily="monospace"
        transform={`rotate(-90,8,${pad.t + inner.h / 2})`}>ω / ω₀</text>
    </svg>
  );
}

// ── Polariton hopping visualiser ─────────────────────────────────────────────
function HoppingViz({ N, J }: { N: number; J: number }) {
  const [psi, setPsi] = useState<Cplx[]>([]);
  const [ticks, setTicks]  = useState(0);
  const [running, setRunning] = useState(true);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<{ psi: Cplx[]; t: number }>({ psi: [], t: 0 });

  useEffect(() => {
    const init: Cplx[] = Array.from({ length: N }, (_, i) =>
      i === 0 ? { re: 1, im: 0 } : { re: 0, im: 0 }
    );
    stateRef.current = { psi: init, t: 0 };
    setPsi(init);
    setTicks(0);
  }, [N, J]);

  useEffect(() => {
    if (!running) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    let last = 0;
    const step = (ts: number) => {
      if (last && ts - last > 40) {   // ~24 fps cap
        const dt = 0.04;
        let { psi: cur } = stateRef.current;
        for (let s = 0; s < 3; s++) cur = rk4Step(cur, J, dt);
        stateRef.current.psi = cur;
        setPsi([...cur]);
        setTicks(t => t + 1);
        last = ts;
      } else if (!last) last = ts;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, J, N]);

  const pops = psi.map(p => p.re ** 2 + p.im ** 2);
  const maxPop = Math.max(...pops, 0.01);

  return (
    <div>
      <div className="flex gap-1 mb-3 items-end justify-center h-24">
        {pops.map((pop, i) => (
          <div key={i} className="flex flex-col items-center gap-1" style={{ width: `${Math.max(16, 200 / N)}px` }}>
            <div className="w-full rounded transition-all duration-75"
              style={{
                height: `${Math.max(4, (pop / maxPop) * 72)}px`,
                background: `rgba(20,184,166,${0.3 + 0.7 * (pop / maxPop)})`,
                border: `1px solid ${TEAL}60`,
              }} />
            <p className="text-[8px] font-mono text-slate-500">{i + 1}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-slate-500 font-mono">
          population |ψₙ|²  ·  t={((ticks * 3 * 0.04)).toFixed(2)} (ℏ/J)
        </span>
        <button onClick={() => setRunning(r => !r)}
          className="px-2 py-0.5 rounded text-[10px] font-mono transition-colors"
          style={{
            border: `1px solid ${TEAL}50`,
            color: running ? "#f43f5e" : TEAL,
            background: running ? "#f43f5e20" : TEAL + "20",
          }}>
          {running ? "pause" : "resume"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TheNetworkPage() {
  const [J,   setJ]   = useState(0.1);
  const [Ncav, setNcav] = useState(8);
  const [kIdx, setKIdx] = useState(40);   // k·a index 0–99

  const ka      = -Math.PI + (2 * Math.PI * kIdx) / 99;
  const omega   = dispersion(ka, J);
  const vg      = groupVelocity(ka, J);
  const slowFactor = Math.abs(vg) < 1e-6 ? Infinity : 1 / Math.abs(vg);
  const bandwidth = 4 * J;
  const groupDelay = Math.abs(vg) < 1e-6 ? Infinity : Ncav / Math.abs(vg);

  const fmtNum = (v: number, d = 3) =>
    Math.abs(v) === Infinity ? "∞" : v.toFixed(d);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Badges ────────────────────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 12 of 12",               color: TEAL },
              { label: `First Disclosure ${PAGE_DATE}`, color: "#fb923c" },
              { label: "AGPL-3.0",                    color: "#fb923c" },
              { label: "Copyleft",                    color: "#fb923c" },
              { label: "ω(k)=ω₀−2J·cos(ka)",          color: TEAL },
              { label: "CROW — slow light",            color: "#a78bfa" },
              { label: "Spectral Relay Mesh basis",    color: "#10b981" },
            ].map(({ label, color }) => (
              <span key={label} className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: color + "25", color, border: `1px solid ${color}40` }}>
                {label}
              </span>
            ))}
          </div>

          <SequenceNav current={12} />

          <div className="flex items-start gap-3">
            <Link href="/the-emitter">
              <button className="text-gray-500 hover:text-white transition-colors mt-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <p className="text-[10px] font-mono text-slate-500 tracking-widest">
                NEXUSOS RESEARCH · TE RATA POU · {PAGE_DATE} ·{" "}
                <a href="https://github.com/nexusosdaily-code/NexusOS"
                   target="_blank" rel="noopener noreferrer"
                   className="hover:opacity-80 inline-flex items-center gap-1"
                   style={{ color: TEAL }}>
                  github.com/nexusosdaily-code/NexusOS <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <h1 className="text-3xl font-bold text-white tracking-tight mt-1">The Network</h1>
              <p className="text-slate-400 text-base mt-1">
                A single Ψ channel cavity (Act 9) stores a photon. A single emitter (Act 11)
                creates one. This Act asks: how does the photon travel? Couple N cavities in
                a chain and the answer emerges from first principles — a photonic tight-binding
                band, slow light at the edges, and polariton hopping as the carrier mechanism.
                This is the Spectral Relay Mesh at its root.
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero equation ─────────────────────────────────────────── */}
        <div className="rounded-2xl border p-6 mb-5 text-center relative overflow-hidden"
          style={{ borderColor: TEAL + "30", background: TEAL + "08" }}>
          <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
            <Network className="w-64 h-64" style={{ color: TEAL }} />
          </div>
          <div className="relative space-y-3">
            <div className="text-2xl font-mono font-bold" style={{ color: "#5eead4" }}>
              ω(k) = ω₀ − 2J · cos(k · a)
            </div>
            <p className="text-sm text-gray-400">
              Tight-binding dispersion · ω₀ = single-cavity resonance · J = photon hopping rate · a = cavity spacing
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500">
              <span>v_g = dω/dk = 2Ja·sin(ka) &nbsp;·&nbsp; group velocity</span>
              <span>W = 4J &nbsp;·&nbsp; bandwidth</span>
              <span>S = c/v_g &nbsp;·&nbsp; slow-light factor</span>
            </div>
          </div>
        </div>

        {/* ── Live metric cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MetricCard label="ω(k) / ω₀"    value={fmtNum(omega)}          sub="cavity dispersion at k" color={TEAL} />
          <MetricCard label="v_g (J·a units)" value={fmtNum(vg, 4)}       sub="group velocity at k"    color="#a78bfa" />
          <MetricCard label="Slow factor"    value={slowFactor === Infinity ? "∞" : fmtNum(slowFactor, 1) + "×"}
                                                                            sub="c / v_g — slow light"  color="#10b981" />
          <MetricCard label="Group delay"    value={groupDelay === Infinity ? "∞" : fmtNum(groupDelay, 2)}
                                                                            sub={`${Ncav} cavities (J·a units)`} color="#f59e0b" />
        </div>

        {/* ── §1 — From Cavity to Chain ──────────────────────────────── */}
        <Section title="§1 — From Single Cavity to Chain: The CROW" icon={GitBranch} color={TEAL}>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Yariv et al. (1999) showed that a series of high-Q resonators, each nearly
            identical, coupled only through evanescent-field overlap, behaves as a waveguide.
            The photon does not propagate through free space — it hops, one cavity at a time,
            through quantum-mechanical tunnelling. The Coupled Resonator Optical Waveguide
            (CROW) is the minimal model of photon transport that is compatible with the Ψ
            channel architecture: each resonator is a Ψ channel cavity (Act 9), and the
            hopping rate J is controlled by the inter-cavity gap.
          </p>
          <div className="rounded-lg bg-slate-800 p-4 font-mono text-sm text-center mb-4">
            <p style={{ color: "#5eead4" }}>
              H = Σᵢ ω₀ aᵢ†aᵢ − J Σᵢ ( aᵢ†aᵢ₊₁ + aᵢ₊₁†aᵢ )
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Tight-binding Hamiltonian · aᵢ†aᵢ = photon number at site i · J = hopping rate
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { term: "ω₀", name: "Single-cavity frequency", desc: "Each Ψ channel cavity has the same resonance — set by its radius and refractive index from Act 9." },
              { term: "J",   name: "Photon hopping rate", desc: "Determined by the evanescent-field overlap between adjacent cavities. Controlled by inter-cavity gap d." },
              { term: "k",   name: "Bloch wavevector", desc: "The collective mode index. k ∈ (−π/a, π/a] — the first Brillouin zone of the cavity array." },
            ].map(t => (
              <div key={t.term} className="rounded-lg border p-3"
                style={{ borderColor: TEAL + "20", background: TEAL + "08" }}>
                <code className="font-mono text-sm font-bold block mb-2" style={{ color: "#5eead4" }}>{t.term}</code>
                <p className="text-[11px] font-semibold text-white mb-1">{t.name}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── §2 — Band Structure (interactive) ─────────────────────── */}
        <Section title="§2 — Band Structure: ω(k) = ω₀ − 2J·cos(k·a)" icon={BarChart2} color={TEAL}>
          <div className="grid md:grid-cols-2 gap-6 mb-4">
            <div>
              <div className="space-y-4 mb-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Hopping rate J / ω₀</span>
                    <span className="font-mono" style={{ color: TEAL }}>{J.toFixed(3)}</span>
                  </div>
                  <input type="range" min={0.01} max={0.45} step={0.005}
                    value={J} onChange={e => setJ(Number(e.target.value))}
                    className="w-full accent-teal-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Wavevector k·a / π</span>
                    <span className="font-mono" style={{ color: TEAL }}>
                      {(ka / Math.PI).toFixed(2)}π
                    </span>
                  </div>
                  <input type="range" min={0} max={99} step={1}
                    value={kIdx} onChange={e => setKIdx(Number(e.target.value))}
                    className="w-full accent-teal-500" />
                </div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3 space-y-1.5 text-xs font-mono">
                {[
                  { label: "ω(k) / ω₀",  value: fmtNum(omega), color: TEAL },
                  { label: "Bandwidth W",  value: `4J = ${(4*J).toFixed(3)} ω₀`, color: "#a78bfa" },
                  { label: "v_g (J·a)",   value: fmtNum(vg, 4), color: "#10b981" },
                  { label: "Slow factor", value: slowFactor === Infinity ? "∞" : fmtNum(slowFactor, 1) + "×", color: "#f59e0b" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <BandStructure J={J} />
              <p className="text-[9px] text-slate-600 text-center mt-1">
                ω(k)/ω₀ vs k·a — slope = group velocity. Band edges (k=0, k=±π) → v_g=0 → slow light
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 p-3">
            <p className="text-[10px] text-slate-300 leading-relaxed">
              <span className="font-semibold" style={{ color: TEAL }}>Key insight: </span>
              the group velocity v_g = 2Ja·sin(ka) is zero at the Brillouin zone edges (k = ±π/a)
              and maximum at the zone centre (k = 0). Engineering the operating point near the zone edge
              gives arbitrarily slow light — storing photons in the chain for a time τ_d = N·a/v_g
              that diverges as k → ±π/a. This is the temporal compression mechanism of the Spectral
              Relay Mesh: photons slowed to ~c/100 in a Ψ-channel CROW have 100× longer interaction
              time with the emitters at each node.
            </p>
          </div>
        </Section>

        {/* ── §3 — Polariton Hopping Simulation ─────────────────────── */}
        <Section title="§3 — Polariton Hopping Dynamics (Live Simulation)" icon={Activity} color={TEAL}>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Start with one photon in cavity 1 (|ψ₁|²=1, all others 0). The tight-binding
            equation iℏ ∂ψₙ/∂t = −J(ψₙ₋₁ + ψₙ₊₁) propagates the wavepacket through the
            chain in real time, solved here by 4th-order Runge-Kutta.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Number of cavities N</span>
                  <span className="font-mono" style={{ color: TEAL }}>{Ncav}</span>
                </div>
                <input type="range" min={2} max={16} step={1}
                  value={Ncav} onChange={e => setNcav(Number(e.target.value))}
                  className="w-full accent-teal-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Hopping rate J (same as §2)</span>
                  <span className="font-mono" style={{ color: TEAL }}>{J.toFixed(3)} ω₀</span>
                </div>
                <p className="text-[9px] text-slate-600">Adjust in §2 — simulation uses same J</p>
              </div>
              <div className="rounded-lg border border-slate-700 p-3 text-[10px] space-y-1">
                <p className="text-slate-300">
                  <span className="font-semibold" style={{ color: TEAL }}>Boundary conditions:</span>{" "}
                  hard walls (ψ₀ = ψ_&#123;N+1&#125; = 0). Photon reflects at chain ends — standing wave
                  interference between left- and right-propagating modes.
                </p>
                <p className="text-slate-500">
                  In a real Spectral Relay Mesh segment: matched impedance at each port suppresses
                  reflection, giving unidirectional Bloch propagation.
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-3">LIVE |ψₙ|² — POPULATION PER CAVITY</p>
              <HoppingViz N={Ncav} J={J} />
            </div>
          </div>
        </Section>

        {/* ── §4 — Slow Light and Group Delay ───────────────────────── */}
        <Section title="§4 — Slow Light and Group Delay" icon={Zap} color={TEAL}>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The most striking consequence of the CROW dispersion is slow light. At the
            band edges, v_g → 0 and the delay time for N cavities diverges. This is not
            an approximation — it is an exact consequence of the tight-binding Hamiltonian
            and the periodicity of the array.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Number of cavities N</span>
                <span className="font-mono" style={{ color: TEAL }}>{Ncav}</span>
              </div>
              <input type="range" min={2} max={40} step={1}
                value={Ncav} onChange={e => setNcav(Number(e.target.value))}
                className="w-full accent-teal-500 mb-4" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-2 text-slate-500 font-mono">k·a</th>
                      <th className="text-left p-2 text-slate-500 font-mono">v_g (J·a)</th>
                      <th className="text-left p-2 text-slate-500 font-mono">Slow factor</th>
                      <th className="text-left p-2 text-slate-500 font-mono">τ_g (N={Ncav})</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {[0.05, 0.25, 0.5, 0.75, 0.95].map(frac => {
                      const ka_ = frac * Math.PI;
                      const vg_ = groupVelocity(ka_, J);
                      const sf_ = Math.abs(vg_) < 1e-9 ? Infinity : 1 / Math.abs(vg_);
                      const tg_ = Math.abs(vg_) < 1e-9 ? Infinity : Ncav / Math.abs(vg_);
                      return (
                        <tr key={frac} className="border-b border-slate-800/60">
                          <td className="p-2 font-mono">{frac.toFixed(2)}π</td>
                          <td className="p-2 font-mono" style={{ color: TEAL }}>{vg_.toFixed(4)}</td>
                          <td className="p-2 font-mono text-amber-400">
                            {sf_ === Infinity ? "∞" : sf_.toFixed(1)}×
                          </td>
                          <td className="p-2 font-mono text-purple-300">
                            {tg_ === Infinity ? "∞" : tg_.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border p-4"
                style={{ borderColor: TEAL + "30", background: TEAL + "08" }}>
                <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: TEAL }}>CROW SLOW-LIGHT FORMULA</p>
                <div className="font-mono text-center space-y-2">
                  <p className="text-white text-sm">τ_g = N · a / v_g</p>
                  <p className="text-slate-400 text-xs">= N / (2J · |sin(ka)|)</p>
                  <p className="text-slate-500 text-[10px] mt-1">
                    τ_g → ∞ at band edges (ka → 0, π)
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3 text-[10px] text-slate-400 leading-relaxed">
                <span className="font-semibold text-white">Notomi et al. (2001)</span> measured
                slow-light factors S &gt; 90 in photonic crystal CROW structures. With S = 100
                and N = 100 cavities, the effective group delay is 100× longer than free-space
                propagation over the same physical length — equivalent to a 10,000× longer
                interaction path without increasing device footprint.
              </div>
            </div>
          </div>
        </Section>

        {/* ── §5 — Bose-Hubbard and Nonlinearity ────────────────────── */}
        <Section title="§5 — Bose-Hubbard Model: When Photons Interact" icon={Layers} color={TEAL}>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            When U ≠ 0 (on-site photon-photon repulsion from the cavity nonlinearity), the
            CROW becomes a Bose-Hubbard chain — the photonic analogue of electrons in a
            Mott insulator. Greentree et al. (2006) and Hartmann et al. (2006) simultaneously
            predicted a quantum phase transition between a superfluid (J ≫ U, photons
            delocalised) and a Mott insulator (U ≫ J, exactly one photon per cavity).
          </p>
          <div className="rounded-lg bg-slate-800 p-4 font-mono text-sm text-center mb-4">
            <p style={{ color: "#5eead4" }}>
              H = −J Σᵢ (aᵢ†aᵢ₊₁ + h.c.) + U/2 Σᵢ nᵢ(nᵢ−1) − μ Σᵢ nᵢ
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              J = hopping · U = on-site photon repulsion · μ = chemical potential (laser drive)
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              {
                regime: "U/J → 0",
                name: "Superfluid",
                desc: "Photons delocalise across the chain. Each cavity is in a coherent state |α⟩. Phase is well-defined. This is the linear CROW regime.",
                color: TEAL,
              },
              {
                regime: "U/J ~ 1",
                name: "Quantum critical",
                desc: "Number and phase fluctuations are comparable. Strongly correlated photon states. Quantum entanglement between adjacent Ψ channels.",
                color: "#a78bfa",
              },
              {
                regime: "U/J → ∞",
                name: "Mott insulator",
                desc: "Exactly one photon per cavity. Photon transport is blocked. Number is well-defined. The Ψ channel becomes a deterministic single-photon register.",
                color: "#f59e0b",
              },
            ].map(r => (
              <div key={r.regime} className="rounded-lg border p-3"
                style={{ borderColor: r.color + "30", background: r.color + "08" }}>
                <code className="font-mono text-sm font-bold block mb-1" style={{ color: r.color }}>{r.regime}</code>
                <p className="text-[11px] font-semibold text-white mb-1">{r.name}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── §6 — WNSP Connection ──────────────────────────────────── */}
        <Section title="§6 — WNSP Connection: The Spectral Relay Mesh from First Principles" icon={Waves} color={TEAL}>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-widest" style={{ color: TEAL }}>
                WHAT ACT 12 INHERITS
              </p>
              {[
                { act: "Act 9",  link: "/resonance-cavity",  desc: "Each CROW node is a WGM resonator with quality factor Q. Higher Q → smaller J (longer photon lifetime vs. hopping time)." },
                { act: "Act 10", link: "/polariton-exchange", desc: "Strong coupling g > κ → Act 10. Weak coupling g < κ → Act 11. CROW propagation sits between: g ~ J, κ small." },
                { act: "Act 11", link: "/the-emitter",        desc: "The Purcell-enhanced emitter (Act 11) injects the single photon into cavity 1. The CROW then carries it." },
              ].map(({ act, link, desc }) => (
                <div key={act} className="flex gap-2 text-xs">
                  <Link href={link} className="font-mono w-12 flex-shrink-0 transition-colors hover:opacity-80"
                    style={{ color: TEAL }}>{act}</Link>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-widest" style={{ color: TEAL }}>
                WHAT ACT 12 OPENS
              </p>
              {[
                { label: "Act 13 — The Observer (future)", desc: "QND dispersive readout of a Ψ channel state — reading the photon number without destroying it. χ = g²/Δ dispersive coupling." },
                { label: "Spectral Relay Mesh (SRM)", desc: "N → large network of CROW segments, routed by Ψ channel address. Physical implementation of the 51,200 orthogonal channels." },
              ].map(({ label, desc }) => (
                <div key={label} className="flex gap-2 text-xs">
                  <span className="text-slate-500 font-mono w-28 flex-shrink-0">{label}</span>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
              <div className="rounded-lg border p-3 mt-2"
                style={{ borderColor: TEAL + "20", background: TEAL + "08" }}>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  <span className="font-semibold" style={{ color: "#5eead4" }}>SNIC target: </span>
                  256 WDM wavelengths × CROW chains with N~50 nodes per chain. Slow-light factor S~10
                  at nominal operating k gives 10× effective path length per physical segment.
                  Total SRM capacity = N_λ · N_OAM · N_Pol · N_Dir · R_sym · M — the WNSP density
                  equation from the system overview.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-slate-800 p-4">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-2">CROW → SPECTRAL RELAY MESH — DESIGN MAP</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { crow: "Single resonator", srm: "Ψ channel (1 of 51,200)" },
                { crow: "CROW chain (N)",   srm: "SRM segment" },
                { crow: "Hopping J",        srm: "Inter-channel coupling κ_hop" },
                { crow: "Band edge (slow)", srm: "Buffer zone — temporal storage" },
              ].map(({ crow, srm }) => (
                <div key={crow} className="rounded border border-slate-700 p-2">
                  <p className="text-slate-500 text-[9px] mb-0.5">CROW</p>
                  <p className="text-white font-semibold text-[10px] mb-1">{crow}</p>
                  <p className="text-[9px] mb-0.5" style={{ color: TEAL }}>SRM</p>
                  <p className="text-[10px] text-slate-400">{srm}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── References ────────────────────────────────────────────── */}
        <Section title="References" icon={ExternalLink} color="#475569">
          <div className="space-y-3">
            <Ref n={1} authors="Yariv, A. et al." year={1999}
              title="Coupled-resonator optical waveguide: a proposal and analysis"
              journal="Opt. Lett. 24, 711"
              doi="https://doi.org/10.1364/OL.24.000711"
              note="The original CROW proposal. Derived the tight-binding dispersion ω(k) = ω₀ + κ·cos(kR) and showed slow-light propagation at the band edges." />
            <Ref n={2} authors="Notomi, M. et al." year={2001}
              title="Extremely large group-velocity dispersion of line-defect waveguides in photonic crystal slabs"
              journal="Phys. Rev. Lett. 87, 253902"
              doi="https://doi.org/10.1103/PhysRevLett.87.253902"
              note="Experimental demonstration of slow-light factors >90 in photonic crystal CROW structures. First quantitative measurement of group delay engineering." />
            <Ref n={3} authors="Greentree, A. D. et al." year={2006}
              title="Quantum phase transitions of light"
              journal="Nat. Phys. 2, 856"
              doi="https://doi.org/10.1038/nphys466"
              note="Predicted the superfluid–Mott insulator quantum phase transition for photons in a Bose-Hubbard CROW. Opened the field of quantum many-body physics with light." />
            <Ref n={4} authors="Hartmann, M. J., Brandão, F. G. S. L. & Plenio, M. B." year={2006}
              title="Strongly interacting polaritons in coupled arrays of cavities"
              journal="Nat. Phys. 2, 849"
              doi="https://doi.org/10.1038/nphys462"
              note="Simultaneous independent prediction of the photonic Bose-Hubbard model, including the polariton hopping and Mott insulator regimes." />
            <Ref n={5} authors="Pou, T. R." year={2026}
              title="The Network — CROW, Polariton Hopping and the Spectral Relay Mesh"
              journal={`NexusOS Research, ${BASE}, AGPL-3.0. First disclosure ${PAGE_DATE}.`}
              note="Act 12 of the NexusOS physics sequence. Derives the Spectral Relay Mesh from the tight-binding CROW model. Connects Acts 9–11 to the SNIC hardware architecture." />
          </div>
        </Section>

        {/* ── Bottom sequence nav + teaser ──────────────────────────── */}
        <div className="rounded-xl border p-4 mt-6"
          style={{ borderColor: TEAL + "20", background: TEAL + "08" }}>
          <SequenceNav current={12} />
          <div className="border-t border-slate-800 pt-3 mt-4 text-center">
            <p className="text-[10px] font-mono text-slate-600 tracking-widest mb-1">
              NEXT — ACT 14 OF ?
            </p>
            <p className="text-slate-500 text-xs">
              The Memory · long-lived quantum state storage · spin-photon interface, T₁, T₂
            </p>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[10px] font-mono text-slate-600">
            {BASE}/the-network · AGPL-3.0 · NexusOS Research · Te Rata Pou · {PAGE_DATE}
          </p>
        </div>
      </div>
    </div>
  );
}
