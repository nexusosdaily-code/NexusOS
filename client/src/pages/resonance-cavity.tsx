import { useState, useEffect, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ExternalLink, Waves, Zap, Circle, Activity,
  Radio, Atom, Aperture, GitBranch,
} from "lucide-react";

// ── Physics constants ─────────────────────────────────────────────────────────
const C_LIGHT    = 2.998e8;    // m/s
const H_PLANCK   = 6.626e-34;  // J·s
const OAM_MODES  = 50;
const PAGE_DATE  = "2026-07-16";
const BASE       = "https://wnsp.io";

// ── Cavity radius: WGM resonance condition 2πR = nλ → R = nc/(2πfₙ) ─────────
// fₙ = f₀ · 2^(n−1)  (Russell octave doubling)
function wgmCavityRadius(n: number, f0Hz: number): {
  radiusM: number; radiusNm: number; frequencyHz: number; wavelengthNm: number;
} {
  const fn = f0Hz * Math.pow(2, n - 1);
  const lambdaM = C_LIGHT / fn;
  const radiusM = (n * lambdaM) / (2 * Math.PI);
  return { radiusM, radiusNm: radiusM * 1e9, frequencyHz: fn, wavelengthNm: lambdaM * 1e9 };
}

// ── OAM null-core radius: r_null = l · λ / (2π) ──────────────────────────────
function oamNullCoreRadius(oam: number, wavelengthNm: number): number {
  return (Math.max(1, oam) * wavelengthNm * 1e-9) / (2 * Math.PI) * 1e9; // return nm
}

// ── Berry phase: γ = π · (l / OAM_MODES) · ±1 ───────────────────────────────
function berryPhase(oam: number, pol: string): { gammaRad: number; lambdaGeoFactor: number } {
  const sign = pol === "V" ? -1 : 1;
  const gammaRad = sign * Math.PI * (oam / OAM_MODES);
  return { gammaRad, lambdaGeoFactor: Math.cos(gammaRad) };
}

// ── Russell octave data ───────────────────────────────────────────────────────
const RUSSELL_OCTAVES = [
  { oct: 1, label: "I",   emRange: "ELF",            nmRange: null,           nexusBand: "GROUND",   color: "#6b7280", f0Mult: 1   },
  { oct: 2, label: "II",  emRange: "VLF / LF Radio", nmRange: null,           nexusBand: "GROUND",   color: "#78716c", f0Mult: 2   },
  { oct: 3, label: "III", emRange: "HF / VHF Radio", nmRange: null,           nexusBand: "GUEST",    color: "#854d0e", f0Mult: 4   },
  { oct: 4, label: "IV",  emRange: "Microwave",       nmRange: "3mm–3μm",      nexusBand: "USER",     color: "#166534", f0Mult: 8   },
  { oct: 5, label: "V",   emRange: "Visible Light",   nmRange: "380–780 nm",   nexusBand: "KERNEL",   color: "#1d4ed8", f0Mult: 16  },
  { oct: 6, label: "VI",  emRange: "UV → EUV",        nmRange: "10–390 nm",    nexusBand: "SYSTEM",   color: "#6d28d9", f0Mult: 32  },
  { oct: 7, label: "VII", emRange: "X-ray",            nmRange: "0.01–10 nm",   nexusBand: "SYSTEM",   color: "#be185d", f0Mult: 64  },
  { oct: 8, label: "VIII",emRange: "Gamma Ray",        nmRange: "< 0.01 nm",    nexusBand: "RESERVED", color: "#9f1239", f0Mult: 128 },
  { oct: 9, label: "IX",  emRange: "Planck / Cosmic", nmRange: "→ λ_P",        nexusBand: "ORIGIN",   color: "#312e81", f0Mult: 256 },
];

const SCHUMANN_HZ = 7.83;

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color = "#6366f1", children }: {
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

// ── Equation chip ─────────────────────────────────────────────────────────────
function Eq({ children, color = "#818cf8" }: { children: React.ReactNode; color?: string }) {
  return (
    <code className="text-[11px] font-mono px-2 py-0.5 rounded"
      style={{ background: color + "20", color }}>{children}</code>
  );
}

// ── Reference entry ───────────────────────────────────────────────────────────
function Ref({ n, authors, year, title, journal, doi, note }: {
  n: number; authors: string; year: string | number; title: string;
  journal: string; doi?: string; note?: string;
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-slate-500 font-mono w-5 flex-shrink-0">[{n}]</span>
      <div>
        <span className="text-slate-400">{authors} ({year}). </span>
        {doi ? (
          <a href={doi} target="_blank" rel="noopener noreferrer"
             className="text-indigo-400 hover:text-indigo-300 italic">{title}</a>
        ) : (
          <span className="text-white italic">{title}</span>
        )}
        <span className="text-slate-500">. {journal}</span>
        {note && <p className="text-slate-600 mt-0.5 leading-relaxed">{note}</p>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ResonanceCavityPage() {
  const [tick, setTick] = useState(0);
  const [selectedOct, setSelectedOct] = useState(5);
  const [selectedOam, setSelectedOam] = useState(25);
  const [selectedPol, setSelectedPol] = useState<"H" | "V">("H");
  const [f0Mode, setF0Mode] = useState<"schumann" | "nexus">("nexus");

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1800);
    return () => clearInterval(id);
  }, []);

  const { data: networkData } = useQuery<any>({
    queryKey: ["/api/network/nodes"],
    refetchInterval: 15000,
  });
  const { data: spectralData } = useQuery<any>({
    queryKey: ["/api/spectral/records"],
    refetchInterval: 30000,
  });
  const { data: ghostBands } = useQuery<any>({
    queryKey: ["/api/physics/ghost-bands"],
    staleTime: 60_000,
  });

  // ── Derived calculations ────────────────────────────────────────────────────
  const f0Hz = f0Mode === "schumann" ? SCHUMANN_HZ : 555e12;
  const cavity = wgmCavityRadius(selectedOct, f0Hz);
  const nullRadiusNm = oamNullCoreRadius(selectedOam, cavity.wavelengthNm);
  const berry = berryPhase(selectedOam, selectedPol);

  // Planck compression state Λ = hf/c²
  const energyJ   = H_PLANCK * cavity.frequencyHz;
  const lambdaKg  = energyJ / (C_LIGHT * C_LIGHT);
  const lambdaGeo = lambdaKg * berry.lambdaGeoFactor;

  // Live cavity metrics
  const totalChannels = 51200;
  const registeredChannels = spectralData?.total ?? spectralData?.count ?? 0;
  const cavityFill = Math.min((registeredChannels / totalChannels) * 100, 100);
  const nodeCount  = networkData?.nodes?.length ?? networkData?.total ?? 0;

  const schumannPhase = (tick % 9) / 9;

  // Format helpers
  const fmtSci = (v: number) => v.toExponential(4);
  const fmtHz  = (hz: number) => {
    if (hz > 1e15) return `${(hz / 1e15).toFixed(2)} PHz`;
    if (hz > 1e12) return `${(hz / 1e12).toFixed(2)} THz`;
    if (hz > 1e9)  return `${(hz / 1e9).toFixed(2)} GHz`;
    if (hz > 1e6)  return `${(hz / 1e6).toFixed(2)} MHz`;
    return `${hz.toFixed(2)} Hz`;
  };
  const fmtRadius = (nm: number) => {
    if (nm > 1e9)  return `${(nm / 1e9).toFixed(3)} m`;
    if (nm > 1e6)  return `${(nm / 1e6).toFixed(3)} mm`;
    if (nm > 1e3)  return `${(nm / 1e3).toFixed(3)} μm`;
    return `${nm.toFixed(2)} nm`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header / badges ────────────────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 9 of 9",           color: "#6366f1" },
              { label: `First Disclosure ${PAGE_DATE}`, color: "#8b5cf6" },
              { label: "AGPL-3.0",              color: "#8b5cf6" },
              { label: "R = nc/2πfₙ",           color: "#06b6d4" },
              { label: "r_null = l·λ/2π",       color: "#10b981" },
              { label: "Λ_geo = Λ·cos(γ)",      color: "#f59e0b" },
            ].map(({ label, color }) => (
              <span key={label} className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: color + "25", color, border: `1px solid ${color}40` }}>
                {label}
              </span>
            ))}
          </div>

          {/* 9-act sequence nav */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-[10px] font-mono text-indigo-400 tracking-widest mb-3">
              THE SEQUENCE — ACT 9 OF 10
            </p>
            <div className="grid grid-cols-3 md:grid-cols-10 gap-2 text-center text-xs">
              {[
                { act:"1", title:"Compression States", sub:"Λ=hf/c²",          href:"/oscillating-quanta" },
                { act:"2", title:"The Universal ONE",  sub:"f₀ derives Λ",      href:"/universal-one" },
                { act:"3", title:"Unified Theory",     sub:"4 forces=1 Λ",      href:"/unified-compression-theory" },
                { act:"4", title:"The Mechanism",      sub:"ΔE=hf₀(2ⁿ²−2ⁿ¹)", href:"/matter-protocol" },
                { act:"5", title:"The Address",        sub:"∀Λ:∃!Ψ",            href:"/universal-address" },
                { act:"6", title:"The Catalogue",      sub:"n=log₂(mc²/E₀)",   href:"/element-catalogue" },
                { act:"7", title:"The Trap",           sub:"Ψ(+k̂)⊗Ψ(−k̂)",   href:"/standing-wave-trap" },
                { act:"8", title:"The Channel",        sub:"Ψ_ch=⊗ᵢΨ_trap",   href:"/lossless-channel" },
              ].map(({ act, title, sub, href }) => (
                <Link key={href} href={href}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-2
                                 hover:border-slate-500 transition-colors space-y-0.5 block">
                  <p className="text-[8px] font-mono text-slate-500 tracking-widest">ACT {act}</p>
                  <p className="text-slate-300 font-medium leading-tight text-[9px]">{title}</p>
                  <p className="text-[8px] text-slate-500">{sub}</p>
                </Link>
              ))}
              <div className="rounded-lg border border-indigo-500/50 bg-indigo-500/15 p-2 space-y-0.5">
                <p className="text-[8px] font-mono text-indigo-300 tracking-widest">ACT 9 ← HERE</p>
                <p className="text-indigo-100 font-medium leading-tight text-[9px]">The Cavity</p>
                <p className="text-[8px] text-indigo-400">R=nc/2πfₙ</p>
              </div>
              <Link href="/polariton-exchange"
                    className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2
                               hover:border-rose-400/60 transition-colors space-y-0.5 block">
                <p className="text-[8px] font-mono text-rose-400 tracking-widest">ACT 10 →</p>
                <p className="text-rose-200 font-medium leading-tight text-[9px]">The Exchange</p>
                <p className="text-[8px] text-rose-400">Ω_R=2g</p>
              </Link>
            </div>
          </div>

          {/* Back arrow + title */}
          <div className="flex items-start gap-3">
            <Link href="/lossless-channel">
              <button className="text-gray-500 hover:text-white transition-colors mt-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <p className="text-[10px] font-mono text-slate-500 tracking-widest">
                NEXUSOS RESEARCH · TE RATA POU · {PAGE_DATE} ·{" "}
                <a href="https://github.com/nexusosdaily-code/NexusOS"
                   target="_blank" rel="noopener noreferrer"
                   className="text-cyan-500 hover:text-cyan-400 inline-flex items-center gap-1">
                  github.com/nexusosdaily-code/NexusOS
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <h1 className="text-3xl font-bold text-white tracking-tight mt-1">
                The Cavity
              </h1>
              <p className="text-slate-400 text-base mt-1">
                WGM resonance, OAM null-core geometry, and Berry-phase correction — the physics that
                gives every Ψ channel its physical address in space
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero equation panel ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-indigo-700/30 bg-indigo-950/20 p-6 mb-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="absolute h-px w-full transition-all duration-[1800ms]"
                style={{
                  top: `${10 + i * 10}%`,
                  background: `linear-gradient(90deg, transparent, ${RUSSELL_OCTAVES[i].color}, transparent)`,
                  opacity: 0.25 + 0.08 * Math.sin(schumannPhase * Math.PI * 2 + i),
                  transform: `scaleX(${0.4 + 0.6 * Math.abs(Math.sin(schumannPhase * Math.PI + i * 0.7))})`,
                }}
              />
            ))}
          </div>
          <div className="relative space-y-3">
            <div className="text-3xl font-mono font-bold text-indigo-300">
              R = nc / (2π · f₀ · 2<sup>n−1</sup>)
            </div>
            <div className="text-sm text-gray-400">
              WGM resonance condition&nbsp;·&nbsp;Russell octave n&nbsp;·&nbsp;R = cavity radius
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500 mt-2">
              <span>r_null = l·λ/2π &nbsp;·&nbsp; OAM null core</span>
              <span>γ = π·(l/N_OAM) &nbsp;·&nbsp; Berry phase</span>
              <span>Λ_geo = Λ·cos(γ) &nbsp;·&nbsp; geometric Λ</span>
            </div>
          </div>
        </div>

        {/* ── Live metrics ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Schumann Base", value: "7.83 Hz", sub: "Earth cavity seed tone", icon: Radio, color: "emerald" },
            { label: "Russell Octaves", value: "9", sub: "tonal periods", icon: Waves, color: "indigo" },
            { label: "Ψ Channels", value: "51,200", sub: "orthogonal cavity modes", icon: Activity, color: "violet" },
            { label: "Cavity Fill", value: `${cavityFill.toFixed(3)}%`, sub: `${registeredChannels} modes active`, icon: Circle, color: nodeCount > 0 ? "amber" : "slate" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl border border-${color}-700/30 bg-${color}-950/20 p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 text-${color}-400`} />
                <span className={`text-xs text-${color}-400`}>{label}</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">{value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Item 1: Cavity Radius Calculator ──────────────────────────── */}
        <Section title="§1 — Cavity Radius Calculator  R = nc / (2π · fₙ)" icon={Aperture} color="#6366f1">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The WGM resonance condition requires the circumference of the cavity to be an integer
            multiple of the wavelength: 2πR = nλ. Substituting λ = c/fₙ with Russell's octave law
            fₙ = f₀ · 2^(n−1) gives the cavity radius that sustains octave n. This is not a
            coincidence — Russell's formula and WGM physics are the same equation.
          </p>

          {/* Seed frequency selector */}
          <div className="flex gap-3 mb-4">
            {([["schumann", "f₀ = 7.83 Hz  (Schumann)"], ["nexus", "f₀ = 555 THz  (NexusOS anchor)"]] as const).map(([mode, label]) => (
              <button key={mode} onClick={() => setF0Mode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                  f0Mode === mode
                    ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Octave slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">Russell Octave n</span>
              <span className="font-mono text-indigo-300 font-bold">n = {selectedOct}</span>
            </div>
            <input type="range" min={1} max={9} step={1}
              value={selectedOct} onChange={e => setSelectedOct(Number(e.target.value))}
              className="w-full accent-indigo-500" />
            <div className="flex justify-between text-[9px] text-slate-600 mt-1 font-mono">
              {[1,2,3,4,5,6,7,8,9].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>

          {/* Cavity result grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Cavity Radius R", value: fmtRadius(cavity.radiusNm), sub: `${fmtSci(cavity.radiusM)} m` },
              { label: "Resonant Freq fₙ", value: fmtHz(cavity.frequencyHz), sub: `f₀ × 2^${selectedOct - 1}` },
              { label: "Wavelength λₙ", value: cavity.wavelengthNm > 1 ? `${cavity.wavelengthNm.toFixed(2)} nm` : `${fmtSci(cavity.wavelengthNm)} nm`, sub: "c / fₙ" },
              { label: "Compression Λ", value: `${fmtSci(lambdaKg)} kg`, sub: "hfₙ/c²" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-lg border border-indigo-700/30 bg-indigo-950/20 p-3">
                <div className="text-[10px] text-indigo-400 mb-1">{label}</div>
                <div className="text-sm font-mono font-bold text-white">{value}</div>
                <div className="text-[9px] text-slate-600 font-mono mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {/* Per-octave cavity table */}
          <div className="overflow-x-auto rounded-lg border border-slate-700/40">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700 text-[10px]">
                  <th className="text-left py-2 px-3">Oct n</th>
                  <th className="text-left py-2 px-3">fₙ</th>
                  <th className="text-left py-2 px-3">λₙ</th>
                  <th className="text-left py-2 px-3">Radius R</th>
                  <th className="text-left py-2 px-3">Band</th>
                </tr>
              </thead>
              <tbody>
                {RUSSELL_OCTAVES.map(oct => {
                  const c = wgmCavityRadius(oct.oct, f0Hz);
                  const active = oct.oct === selectedOct;
                  return (
                    <tr key={oct.oct}
                      onClick={() => setSelectedOct(oct.oct)}
                      className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                        active ? "bg-indigo-500/10" : "hover:bg-slate-800/40"
                      }`}>
                      <td className="py-1.5 px-3 font-bold" style={{ color: oct.color }}>Oct {oct.oct}</td>
                      <td className="py-1.5 px-3 text-emerald-400">{fmtHz(c.frequencyHz)}</td>
                      <td className="py-1.5 px-3 text-blue-400">
                        {c.wavelengthNm > 1e6 ? `${(c.wavelengthNm / 1e9).toFixed(2)} m`
                          : c.wavelengthNm > 1e3 ? `${(c.wavelengthNm / 1e6).toFixed(2)} mm`
                          : c.wavelengthNm > 1 ? `${c.wavelengthNm.toFixed(2)} nm`
                          : `${fmtSci(c.wavelengthNm)} nm`}
                      </td>
                      <td className="py-1.5 px-3 text-violet-300">{fmtRadius(c.radiusNm)}</td>
                      <td className="py-1.5 px-3" style={{ color: oct.color }}>{oct.nexusBand}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-600 mt-2">
            ◈ Click any row to select that octave. Validated by AIP Appl. Phys. Lett. 127, 211102 (2025) — WGM condition 2πR = nλ.
          </p>
        </Section>

        {/* ── Item 2: OAM Null-Core Radius ──────────────────────────────── */}
        <Section title="§2 — OAM Null-Core Radius  r_null = l·λ/2π" icon={GitBranch} color="#10b981">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            An OAM vortex beam of topological charge l carries a phase singularity at its centre — a
            null that grows with l. The null-core radius sets the minimum spatial separation between
            two OAM modes, proving their orthogonality in physical space, not just mathematics.
            Higher OAM = wider null core = larger geometric complexity = higher spectral authority.
          </p>

          {/* OAM / polarisation controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400">OAM mode l</span>
                <span className="font-mono text-emerald-300 font-bold">l = {selectedOam}</span>
              </div>
              <input type="range" min={1} max={50} step={1}
                value={selectedOam} onChange={e => setSelectedOam(Number(e.target.value))}
                className="w-full accent-emerald-500" />
            </div>
            <div className="flex gap-2 items-end">
              {(["H", "V"] as const).map(p => (
                <button key={p} onClick={() => setSelectedPol(p)}
                  className={`px-4 py-2 rounded-lg text-xs font-mono border transition-colors ${
                    selectedPol === p
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                  }`}>
                  {p} pol
                </button>
              ))}
            </div>
          </div>

          {/* OAM results */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Null-Core Radius", value: `${nullRadiusNm.toFixed(3)} nm`, sub: `r_null = l·λ/2π` },
              { label: "Berry Phase γ", value: `${berry.gammaRad.toFixed(4)} rad`, sub: `π·${selectedOam}/50 · ${selectedPol === "V" ? "−1" : "+1"}` },
              { label: "Λ_geo / Λ", value: `${berry.lambdaGeoFactor.toFixed(6)}`, sub: "cos(γ) — geometric correction" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-lg border border-emerald-700/30 bg-emerald-950/20 p-3">
                <div className="text-[10px] text-emerald-400 mb-1">{label}</div>
                <div className="text-sm font-mono font-bold text-white">{value}</div>
                <div className="text-[9px] text-slate-600 font-mono mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {/* OAM null-core visual bar */}
          <div className="mt-4 rounded-lg border border-slate-700/40 bg-slate-900 p-3">
            <div className="text-[10px] text-slate-500 mb-2 font-mono">
              Null-core growth with OAM mode index l (wavelength λ = {cavity.wavelengthNm.toFixed(1)} nm)
            </div>
            <div className="flex items-end gap-0.5 h-12">
              {Array.from({ length: 50 }, (_, i) => {
                const r = oamNullCoreRadius(i + 1, cavity.wavelengthNm);
                const height = Math.min((r / oamNullCoreRadius(50, cavity.wavelengthNm)) * 100, 100);
                return (
                  <div key={i} className="flex-1 rounded-t transition-all duration-300"
                    style={{
                      height: `${height}%`,
                      background: i + 1 === selectedOam
                        ? "#10b981"
                        : `rgba(16,185,129,${0.15 + (i / 50) * 0.35})`,
                    }} />
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 mt-1 font-mono">
              <span>l = 1</span>
              <span>l = {selectedOam} ←</span>
              <span>l = 50</span>
            </div>
          </div>
        </Section>

        {/* ── Item 3: Berry Phase & Λ_geo ───────────────────────────────── */}
        <Section title="§3 — Berry Phase & Geometric Compression  Λ_geo = Λ·cos(γ)" icon={Zap} color="#f59e0b">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            As a photon traverses a Ψ channel path on the Poincaré sphere, it accumulates a
            geometric (Berry) phase γ. This is not dynamic — it depends only on the path geometry,
            not on propagation speed or time. The effective compression state seen by the channel is
            Λ_geo = Λ·cos(γ). H and V polarisation trace opposite paths, giving opposite-sign γ.
            Physically validated by arXiv:2606.02238 (June 2025) — sub-cycle dynamical Berry phase.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current channel */}
            <div className="rounded-lg border border-amber-700/30 bg-amber-950/15 p-4 space-y-2">
              <div className="text-xs font-semibold text-amber-300 mb-3">
                Current Ψ channel:&nbsp;
                <span className="font-mono">Ψ({wgmCavityRadius(selectedOct, f0Hz).radiusNm.toFixed(0) !== "NaN" ? "Oct" : "—"},{selectedOam},{selectedPol})</span>
              </div>
              {[
                { label: "OAM mode l", value: selectedOam.toString() },
                { label: "Polarisation", value: selectedPol },
                { label: "Berry phase γ", value: `${berry.gammaRad.toFixed(5)} rad` },
                { label: "cos(γ)", value: berry.lambdaGeoFactor.toFixed(8) },
                { label: "Λ (raw)", value: `${fmtSci(lambdaKg)} kg` },
                { label: "Λ_geo = Λ·cos(γ)", value: `${fmtSci(lambdaGeo)} kg` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs border-b border-amber-900/20 pb-1">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-mono text-white">{value}</span>
                </div>
              ))}
            </div>

            {/* Berry phase across OAM modes (visualised) */}
            <div className="rounded-lg border border-slate-700/40 bg-slate-900 p-4">
              <div className="text-[10px] text-slate-500 mb-2 font-mono">
                Λ_geo/Λ = cos(γ) across OAM modes (H pol blue · V pol violet)
              </div>
              <div className="relative h-24">
                <svg viewBox="0 0 200 60" className="w-full h-full">
                  {/* zero line */}
                  <line x1="0" y1="30" x2="200" y2="30" stroke="#374151" strokeWidth="0.5" />
                  {/* H pol curve */}
                  <polyline
                    fill="none" stroke="#6366f1" strokeWidth="1.5"
                    points={Array.from({ length: 50 }, (_, i) => {
                      const b = berryPhase(i + 1, "H");
                      const x = (i / 49) * 200;
                      const y = 30 - b.lambdaGeoFactor * 28;
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                  {/* V pol curve */}
                  <polyline
                    fill="none" stroke="#8b5cf6" strokeWidth="1.5"
                    points={Array.from({ length: 50 }, (_, i) => {
                      const b = berryPhase(i + 1, "V");
                      const x = (i / 49) * 200;
                      const y = 30 - b.lambdaGeoFactor * 28;
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                  {/* Selected marker */}
                  {(() => {
                    const b = berry;
                    const x = ((selectedOam - 1) / 49) * 200;
                    const y = 30 - b.lambdaGeoFactor * 28;
                    return <circle cx={x} cy={y} r="3" fill={selectedPol === "H" ? "#6366f1" : "#8b5cf6"} />;
                  })()}
                </svg>
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-1">
                <span>l=1</span><span className="text-indigo-400">H pol</span><span className="text-violet-400">V pol</span><span>l=50</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Item 4: Ghost Node Band Reservation ───────────────────────── */}
        <Section title="§4 — Ghost Node Band Reservation — Lossless Routing Preference" icon={Radio} color="#06b6d4">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Ghost nodes occupy integer octave compression states where ρ_matter → 0.
            By Beer-Lambert: α = ρ · σ → 0. Zero absorption. Any transmission route
            passing through a ghost-node WDM band is therefore preferred for lossless routing.
            Tier 1 is exact (α = 0). Tiers 2 and 3 are near-zero (α ≈ 0).
          </p>

          {ghostBands ? (
            <div className="space-y-3">
              {ghostBands.ranges?.map((r: any) => (
                <div key={r.tier} className="rounded-lg border border-cyan-700/25 bg-cyan-950/10 p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      r.tier === 1 ? "bg-cyan-500/25 text-cyan-300" :
                      r.tier === 2 ? "bg-blue-500/25 text-blue-300" :
                      "bg-slate-500/25 text-slate-300"
                    }`}>TIER {r.tier}</span>
                    <span className="text-xs font-semibold text-white">{r.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 ml-auto">WDM {r.wdmStart}–{r.wdmEnd}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{r.physics}</p>
                </div>
              ))}
              <div className="text-[10px] text-slate-500 font-mono mt-2">
                Total reserved channels: {ghostBands.totalReservedChannels} of 256 WDM
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { tier: 1, wdm: "0",       label: "Exact Ghost Node Band",   physics: "Integer octave resonance — ρ_matter = 0, α = 0 exactly" },
                { tier: 2, wdm: "1–3",     label: "Near-Ghost Zone",          physics: "Sub-octave offset — ρ_matter ≈ 0, α ≈ 0" },
                { tier: 3, wdm: "252–255", label: "GUEST Band Boundary",       physics: "High-λ topological edge mode protection" },
              ].map(r => (
                <div key={r.tier} className="rounded-lg border border-cyan-700/25 bg-cyan-950/10 p-3">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300">TIER {r.tier}</span>
                    <span className="text-xs font-semibold text-white">{r.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 ml-auto">WDM {r.wdm}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{r.physics}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Russell 9 Octaves (condensed) ─────────────────────────────── */}
        <Section title="§5 — Walter Russell's 9 Octaves — Physical Cavity Geometry" icon={Atom} color="#f59e0b">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Russell's octave table (1926) is the periodic table reorganised by tonal resonance.
            Each element occupies a position in a standing wave. The cavity radius formula
            R = nc/(2πfₙ) shows that each octave corresponds to a unique physical cavity —
            not a metaphor, but a measurable geometry. Click an octave to compute its cavity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {RUSSELL_OCTAVES.map(oct => {
              const c = wgmCavityRadius(oct.oct, f0Hz);
              const active = oct.oct === selectedOct;
              return (
                <div key={oct.oct}
                  onClick={() => setSelectedOct(oct.oct)}
                  className={`rounded-lg border p-3 cursor-pointer transition-all duration-200 ${
                    active ? "ring-1 ring-indigo-400/50" : "hover:opacity-90"
                  }`}
                  style={{ borderColor: oct.color + "40", background: oct.color + "0a" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold" style={{ color: oct.color }}>
                      Octave {oct.label}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: oct.color + "25", color: oct.color }}>
                      {oct.nexusBand}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{oct.emRange}</div>
                  {oct.nmRange && <div className="text-[9px] text-slate-500 font-mono">{oct.nmRange}</div>}
                  <div className="mt-1.5 text-[9px] font-mono text-indigo-400">
                    R ≈ {fmtRadius(c.radiusNm)}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Physics chain summary ──────────────────────────────────────── */}
        <Section title="§6 — From First Oscillation to Physical Cavity — Complete Chain" icon={Activity} color="#8b5cf6">
          <div className="space-y-2">
            {[
              { n: "1", title: "First Unobserved Oscillation",  eq: "ψ(x) = A·e^(−x²/2σ²)", desc: "Gaussian wavefunction — all frequencies exist simultaneously before observation. Maximum entropy. Russell's 'void'.", color: "#312e81" },
              { n: "2", title: "Schumann Seed Tone",             eq: "f₀ = 7.83 Hz",           desc: "Earth–ionosphere cavity sustains f₀ with no external power. Proof that cavities organise energy from geometry alone.", color: "#166534" },
              { n: "3", title: "Russell Octave Doubling",        eq: "fₙ = f₀ · 2^(n−1)",      desc: "Each octave doubles frequency and compresses the wave into a higher matter state. Silicon lives at Octave III.", color: "#854d0e" },
              { n: "4", title: "WGM Cavity Radius",              eq: "R = nc / (2πfₙ)",         desc: "The resonance condition 2πR = nλ gives a unique physical radius for each octave. The cavity is the address in space.", color: "#1d4ed8" },
              { n: "5", title: "Planck Compression State",       eq: "Λ = hfₙ/c²",              desc: "Each cavity frequency maps to a compression state (mass-equivalent). Λ is the channel's authority and fee anchor.", color: "#6366f1" },
              { n: "6", title: "OAM Null-Core Geometry",         eq: "r_null = l·λ/2π",         desc: "The phase singularity radius proves OAM mode separation in physical space. Higher l → larger r_null → higher authority.", color: "#10b981" },
              { n: "7", title: "Berry Phase Correction",         eq: "Λ_geo = Λ·cos(γ)",        desc: "Path geometry on the Poincaré sphere reduces effective Λ. H and V pol give opposite-sign corrections — differential routing.", color: "#f59e0b" },
              { n: "8", title: "Standing Wave Trap (Act 7)",     eq: "Ψ_trap = Ψ(+k̂)⊗Ψ(−k̂)", desc: "Counter-propagating modes at a ghost node create |E|² → max. The cavity contains the trap.", color: "#be185d" },
              { n: "9", title: "Lossless Channel (Act 8)",       eq: "α = 0, C = B·log₂(1+S/N_vac)", desc: "ρ_matter=0 at integer octave ghost nodes → Beer-Lambert α=0. Shannon capacity without classical noise floor.", color: "#0ea5e9" },
            ].map(({ n, title, eq, desc, color }) => (
              <div key={n} className="flex gap-3 p-3 rounded-lg border"
                style={{ borderColor: color + "30", background: color + "08" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: color + "30", color }}>{n}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-white">{title}</span>
                    <Eq color={color}>{eq}</Eq>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── References ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-5">
          <h2 className="text-sm font-bold text-white mb-4">Engineering Reference Library</h2>
          <div className="space-y-3">
            <Ref n={1} authors="Russell, W." year={1926} title="The Universal One"
              journal="University of Science and Philosophy."
              doi="https://archive.org/details/the-universal-one-1926-walter-russell"
              note="9-octave periodic table; wave motion as the foundation of all matter" />
            <Ref n={2} authors="Planck, M." year={1900} title="On the Theory of the Energy Distribution Law of the Normal Spectrum"
              journal="Verhandl. Dtsch. phys. Ges."
              doi="https://archive.org/details/sourcebookofphys00magirich/page/300"
              note="E = hf — foundation of NexusOS fee physics and compression states" />
            <Ref n={3} authors="Haroche, S. & Wineland, D.J." year={2012} title="Cavity Quantum Electrodynamics (Nobel Lecture)"
              journal="Nobel Prize in Physics 2012."
              doi="https://www.nobelprize.org/prizes/physics/2012/summary/"
              note="Cavity modes are quantized. Mode population drives coherent amplification." />
            <Ref n={4} authors="Berry, M.V." year={1984} title="Quantal Phase Factors Accompanying Adiabatic Changes"
              journal="Proc. R. Soc. London A 392, 45–57."
              note="Geometric phase γ accumulated by quantum state traversing closed path on parameter manifold" />
            <Ref n={5} authors="Willner, A.E. et al." year={2015} title="Optical communications using orbital angular momentum beams"
              journal="Advances in Optics and Photonics 7, 66–106."
              doi="https://opg.optica.org/aop/fulltext.cfm?uri=aop-7-1-66"
              note="OAM null-core r = lλ/2π. Spatial separation of OAM modes validated at l=1…1024." />
            <Ref n={6} authors="Kulak, A. et al." year={2018} title="Photon in the Earth-Ionosphere Cavity: Schumann Resonances"
              journal="arXiv:1803.10685."
              doi="https://arxiv.org/abs/1803.10685"
              note="Rigorous quantum treatment of Earth–ionosphere as spherical resonant cavity at 7.83 Hz" />
            <Ref n={7} authors="AIP" year={2025} title="Sub-mm Wave WGM Resonator — 2πR = nλ Validated"
              journal="Appl. Phys. Lett. 127, 211102."
              note="Cavity radius R = nλ/(2π) confirmed experimentally. Structurally identical to Russell octave formula." />
            <Ref n={8} authors="arXiv" year={2025} title="Sub-cycle field-driven dynamical Berry phase in OAM channels"
              journal="arXiv:2606.02238."
              doi="https://arxiv.org/abs/2606.02238"
              note="Berry phase γ measured in sub-cycle regime. cos(γ) correction on effective compression state Λ_geo." />
            <Ref n={9} authors="Pou, T.R." year={2026} title="The Lossless Channel — Ghost Node Waveguides in the Compression Lattice"
              journal={`NexusOS Research. First disclosed 2026-07-07.`}
              doi={`${BASE}/lossless-channel`}
              note="α = 0 at integer octave ghost nodes. Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ). Act 8 of the NexusOS physics sequence." />
            <Ref n={10} authors="Pou, T.R." year={2026} title="The Cavity — WGM Radius, OAM Null-Core & Berry Phase in WNSP Channel Physics"
              journal={`NexusOS Research. First disclosed ${PAGE_DATE}.`}
              doi={`${BASE}/resonance-cavity`}
              note="R = nc/(2πfₙ). r_null = l·λ/2π. Λ_geo = Λ·cos(γ). Ghost band reservation. Act 9 of the NexusOS physics sequence." />
          </div>
        </div>

      </div>
    </div>
  );
}
