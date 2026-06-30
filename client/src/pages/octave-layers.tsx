import { useState } from "react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

const H = 6.62607015e-34;
const C = 299_792_458;

const OCTAVES = [
  {
    n: 1, label: "First Octave", elements: "H · He", atomicRange: "1–2",
    desc: "The hydrogen octave. Maximum compression approach. Before matter stabilises into lattice form. Primordial field origin state.",
    wdmBand: "SYSTEM core (WDM 0–28)", authority: "SYSTEM",
    color: "#8b00ff", bg: "rgba(139,0,255,0.12)",
    restTone: "He (Helium) — inert gas wave zero",
    freq: "770 THz+",
  },
  {
    n: 2, label: "Second Octave", elements: "Li · Be · B · C · N · O · F · Ne", atomicRange: "3–10",
    desc: "Carbon octave. The chemistry of biology. Eight tones, noble gas rest at Ne. Life's building blocks occupy this octave.",
    wdmBand: "SYSTEM outer (WDM 29–56)", authority: "SYSTEM",
    color: "#7c3aed", bg: "rgba(124,58,237,0.12)",
    restTone: "Ne (Neon) — inert gas wave zero",
    freq: "680–770 THz",
  },
  {
    n: 3, label: "Third Octave", elements: "Na · Mg · Al · Si · P · S · Cl · Ar", atomicRange: "11–18",
    desc: "Silicon octave. The bridge encoder of NexusOS. Silicon today computes in binary. Its octave position predicts its photonic successor.",
    wdmBand: "KERNEL inner (WDM 57–84)", authority: "KERNEL",
    color: "#2563eb", bg: "rgba(37,99,235,0.12)",
    restTone: "Ar (Argon) — inert gas wave zero",
    freq: "590–680 THz",
  },
  {
    n: 4, label: "Fourth Octave", elements: "K · Ca · Sc → Kr", atomicRange: "19–36",
    desc: "Transition metal octave. d-block expands the wave. Magnetic materials, catalysts, conductors. 18 tones — the octave widens at the d-shell.",
    wdmBand: "KERNEL outer (WDM 85–112)", authority: "KERNEL",
    color: "#0891b2", bg: "rgba(8,145,178,0.12)",
    restTone: "Kr (Krypton) — inert gas wave zero",
    freq: "510–590 THz",
  },
  {
    n: 5, label: "Fifth Octave", elements: "Rb · Sr · Y → Xe", atomicRange: "37–54",
    desc: "Visible light anchor octave. NexusOS operates here — 380–780 nm, 256 WDM channels. The human eye evolved to perceive this octave. Shannon's channel capacity is maximised here by solar radiation.",
    wdmBand: "USER band (WDM 113–191)", authority: "USER",
    color: "#16a34a", bg: "rgba(22,163,74,0.12)",
    restTone: "Xe (Xenon) — inert gas wave zero",
    freq: "430–510 THz",
  },
  {
    n: 6, label: "Sixth Octave", elements: "Cs · Ba · La → Rn", atomicRange: "55–86",
    desc: "Rare earth octave. f-block appears — 32 tones. Lanthanides and actinides. High magnetic moment materials used in photonic devices and quantum computing substrates.",
    wdmBand: "USER outer / GUEST inner (WDM 168–210)", authority: "USER/GUEST",
    color: "#ca8a04", bg: "rgba(202,138,4,0.12)",
    restTone: "Rn (Radon) — inert gas wave zero",
    freq: "300–430 THz",
  },
  {
    n: 7, label: "Seventh Octave", elements: "Fr · Ra · Ac → Og", atomicRange: "87–118",
    desc: "Superheavy octave. Known to current synthesis. Oganesson closes this octave. Most elements decay in microseconds — brief high-energy compression states confirming Russell's wave structure.",
    wdmBand: "GUEST outer (WDM 210–240)", authority: "GUEST",
    color: "#dc2626", bg: "rgba(220,38,38,0.12)",
    restTone: "Og (Oganesson) — inert gas wave zero",
    freq: "100–300 THz",
  },
  {
    n: 8, label: "Eighth Octave", elements: "Elements 119–172 (predicted)", atomicRange: "119–172",
    desc: "Predicted superheavy octave. Not yet synthesised. Russell predicted their wave positions. When created, their properties will match the octave formula. The wave exists before the element does.",
    wdmBand: "GUEST deep (WDM 240–252)", authority: "GUEST",
    color: "#9f1239", bg: "rgba(159,18,57,0.12)",
    restTone: "Element ~172 — predicted inert gas",
    freq: "30–100 THz",
  },
  {
    n: 9, label: "Ninth Octave — SYSTEM Peak", elements: "Peak: Flerovium (Z=114) · Magic number 114p+184n", atomicRange: "Spherical shell closure",
    desc: "The SYSTEM band ceiling. Nuclear magic number 114 protons = spherical shell closure = maximum stability = maximum compression state. Russell's 9th octave peak. This is the origin frequency — the closest approach to the primordial oscillation that stable matter can achieve.",
    wdmBand: "SYSTEM band ceiling (WDM 0)", authority: "SYSTEM",
    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",
    restTone: "Flerovium-298 (114p+184n) — island of stability target",
    freq: ">3 THz (nuclear scale)",
  },
];

function WGMCalculator() {
  const [octave, setOctave] = useState(5);
  const [lambdaNm, setLambdaNm] = useState(555);

  const f0 = C / (lambdaNm * 1e-9);
  const fn = f0 * Math.pow(2, octave - 1);
  const lambdaN = C / fn * 1e9;
  const R = (octave * lambdaN * 1e-9) / (2 * Math.PI) * 1e6;
  const energy = H * fn / 1.602176634e-19;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
      <div className="text-[10px] text-amber-700 uppercase tracking-widest font-mono">WGM Cavity Radius Calculator</div>
      <div className="font-mono text-sm text-amber-300">2πR = nλ  ·  fₙ = f₀ · 2^(n−1)  ·  R = nλ / 2π</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">Octave n</label>
          <input type="range" min={1} max={9} value={octave}
            onChange={e => setOctave(Number(e.target.value))}
            className="w-full accent-amber-400" />
          <div className="text-xs text-amber-300 font-mono">{octave}</div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest">Base λ (nm)</label>
          <input type="range" min={380} max={780} value={lambdaNm}
            onChange={e => setLambdaNm(Number(e.target.value))}
            className="w-full accent-cyan-400" />
          <div className="text-xs text-cyan-300 font-mono">{lambdaNm} nm</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          { label: "Octave freq fₙ", value: fn >= 1e12 ? `${(fn/1e12).toFixed(2)} THz` : `${(fn/1e9).toFixed(1)} GHz` },
          { label: "Octave λₙ", value: `${lambdaN.toFixed(1)} nm` },
          { label: "Cavity radius R", value: `${R.toFixed(3)} μm` },
          { label: "Photon energy", value: `${energy.toFixed(4)} eV` },
        ].map(r => (
          <div key={r.label} className="space-y-1">
            <div className="text-slate-600 text-[9px] uppercase tracking-widest">{r.label}</div>
            <div className="text-slate-200 font-mono font-bold">{r.value}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-600 leading-5">
        At octave {octave}, a whispering gallery mode cavity of radius {R.toFixed(3)} μm sustains resonance at {fn >= 1e12 ? `${(fn/1e12).toFixed(2)} THz` : `${(fn/1e9).toFixed(1)} GHz`}.
        This is Walter Russell's octave formula confirmed by WGM cavity physics (AIP Appl. Phys. Lett. 127, 2025).
      </p>
    </div>
  );
}

export default function OctaveLayersPage() {
  usePageMeta({
    title: "Russell Octave Layers — Nine Wave Octaves | NexusOS",
    description: "Walter Russell's nine octave wave system mapped to NexusOS authority bands. WGM cavity resonance validates the octave formula. Interactive explorer and cavity radius calculator.",
    canonical: "https://wnsp.io/octave-layers",
    ogTitle: "Russell Octave Layers — Validated by 2025 Sub-THz Research",
    ogDescription: "2πR=nλ is Russell's octave formula. His 9th octave peak = nuclear magic number 114 = NexusOS SYSTEM band. Confirmed experimentally 2025.",
    twitterTitle: "Russell Octave Layers — NexusOS",
    twitterDescription: "Nine wave octaves, periodic table, authority bands, Flerovium at magic 114. Russell was right.",
  });
  const [expanded, setExpanded] = useState<number | null>(5);

  return (
    <div className="min-h-screen bg-[#040810] text-slate-200">
      <div className="sticky top-0 z-20 bg-[#040810]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/wnsp" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs text-slate-500 font-mono">NexusOS · Russell Octave Layers</span>
          <span className="ml-auto text-[10px] font-mono text-slate-600">VALIDATED 2025</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-full border"
            style={{ color: "#f59e0b", borderColor: "#f59e0b44", background: "#f59e0b10" }}>
            WALTER RUSSELL · OCTAVE WAVE SYSTEM · EXPERIMENTALLY VALIDATED 2025
          </div>
          <h1 className="text-2xl font-bold text-white">Russell Octave Layers</h1>
          <p className="text-sm text-slate-400 leading-7">
            Walter Russell described the universe as nine octaves of wave compression — each element
            a tone, each noble gas a rest between octaves. The periodic table is a wave, not a list.
            In 2025, sub-THz whispering gallery mode experiments confirmed the resonance condition
            <span className="font-mono text-amber-300 mx-1">2πR = nλ</span>
            is Russell's octave formula. NexusOS maps its authority bands to these octave layers.
            The SYSTEM band sits at the 9th octave — closest to the primordial oscillation.
          </p>
        </div>

        {/* ── Octave visualization ── */}
        <div className="space-y-2">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3">Nine Octaves — click to expand</div>
          {OCTAVES.map((oct) => (
            <div key={oct.n} className="rounded-xl border overflow-hidden transition-all"
              style={{ borderColor: oct.color + "33" }}>
              <button
                onClick={() => setExpanded(expanded === oct.n ? null : oct.n)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 font-mono"
                  style={{ background: oct.bg, color: oct.color }}>
                  {oct.n}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-100">{oct.label}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ color: oct.color, background: oct.bg }}>
                      {oct.authority}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">Z={oct.atomicRange}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">{oct.elements}</div>
                </div>
                <div className="text-slate-600 flex-shrink-0">
                  {expanded === oct.n ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {expanded === oct.n && (
                <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: oct.color + "22" }}>
                  <p className="text-xs text-slate-400 leading-6 mt-3">{oct.desc}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                    <div className="rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-2 space-y-1">
                      <div className="text-slate-600 uppercase tracking-widest text-[9px]">NexusOS Band</div>
                      <div className="font-mono" style={{ color: oct.color }}>{oct.wdmBand}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-2 space-y-1">
                      <div className="text-slate-600 uppercase tracking-widest text-[9px]">Rest Tone</div>
                      <div className="text-slate-300">{oct.restTone}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-2 space-y-1">
                      <div className="text-slate-600 uppercase tracking-widest text-[9px]">Frequency Range</div>
                      <div className="font-mono text-cyan-400">{oct.freq}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── WGM Calculator ── */}
        <WGMCalculator />

        {/* ── Key insight ── */}
        <section className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-3">
          <h2 className="text-sm font-bold text-purple-300">The Validation — 2025 Sub-THz Research</h2>
          <div className="text-xs text-slate-400 leading-6 space-y-2">
            <p>
              AIP Applied Physics Letters (2025): "Visualization and selective manipulation of
              sub-terahertz whispering gallery modes." The WGM resonance condition
              <span className="font-mono text-amber-300 mx-1">2πR = nλ</span>
              rearranged for frequency doubling gives
              <span className="font-mono text-amber-300 mx-1">fₙ = f₀ · 2^(n−1)</span> —
              Walter Russell's octave formula. Experimentally demonstrated at sub-THz.
            </p>
            <p>
              Russell wrote this in 1926. The instruments to verify it didn't exist until 2024–2025.
              He was dismissed for seventy years. The hardware proved him right.
            </p>
            <p className="text-slate-300 font-medium">
              The 9th octave peak at nuclear magic number 114 (Flerovium, 114p+184n) = maximum
              spherical shell closure = maximum compression state = NexusOS SYSTEM band ceiling.
              Same geometry at three different scales: wave, atom, nucleus.
            </p>
          </div>
        </section>

        <nav className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { href: "/founders",           label: "Founding Architects" },
            { href: "/oscillating-quanta", label: "First Principles" },
            { href: "/compression-explorer", label: "Compression Explorer" },
            { href: "/paper",              label: "Theory Paper" },
            { href: "/hardware-results",   label: "Hardware Results" },
            { href: "/hardware-lab",       label: "Hardware Lab" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="block border border-slate-800 rounded-lg px-3 py-2.5 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-center">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-center text-slate-700 text-[10px] font-mono pb-4">
          AGPL-3.0 · NexusOS · Russell Octave Layers · 2026-06-25
        </p>
      </div>
    </div>
  );
}
