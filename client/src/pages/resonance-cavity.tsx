import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Waves, Zap, Circle, Activity, Radio, Eye, Atom } from "lucide-react";

const SPEED_C   = 2.998e8;
const SCHUMANN  = 7.83;

const RUSSELL_OCTAVES = [
  { oct: 1, label: "Octave I",   freqRange: "< 3 Hz – 300 Hz",    emRange: "ELF / SLF",         nmRange: null,         nexusBand: "GROUND",  color: "#6b7280", elements: ["H","He"], note: "Hydrogen / Helium — seed tones" },
  { oct: 2, label: "Octave II",  freqRange: "300 Hz – 300 kHz",    emRange: "VLF / LF Radio",     nmRange: null,         nexusBand: "GROUND",  color: "#78716c", elements: ["Li","Be","B","C","N","O","F","Ne"], note: "First full period — carbon life chemistry" },
  { oct: 3, label: "Octave III", freqRange: "300 kHz – 300 MHz",   emRange: "MF / HF / VHF Radio",nmRange: null,         nexusBand: "GUEST",   color: "#854d0e", elements: ["Na","Mg","Al","Si","P","S","Cl","Ar"], note: "Silicon lives here — bridge hardware" },
  { oct: 4, label: "Octave IV",  freqRange: "300 GHz – 100 THz",   emRange: "Microwave / Far-IR", nmRange: "3mm – 3μm",  nexusBand: "USER",    color: "#166534", elements: ["K","Ca","Sc→Zn","Ga","Ge","As","Se","Br","Kr"], note: "Transition metals — catalysts & semiconductors" },
  { oct: 5, label: "Octave V",   freqRange: "384 – 769 THz",       emRange: "Visible Light",      nmRange: "380 – 780nm",nexusBand: "KERNEL",  color: "#1d4ed8", elements: ["Rb","Sr","Y→Cd","In","Sn","Sb","Te","I","Xe"], note: "CE table lives here — human perception band" },
  { oct: 6, label: "Octave VI",  freqRange: "769 THz – 30 PHz",    emRange: "Near UV → EUV",      nmRange: "10 – 390nm", nexusBand: "SYSTEM",  color: "#6d28d9", elements: ["Cs","Ba","La→Hg","Tl","Pb","Bi","Po","At","Rn"], note: "Rare earths — high-authority spectral anchors" },
  { oct: 7, label: "Octave VII", freqRange: "30 PHz – 30 EHz",     emRange: "Soft / Hard X-ray",  nmRange: "0.01 – 10nm",nexusBand: "SYSTEM",  color: "#be185d", elements: ["Fr","Ra","Ac→Og"], note: "Actinides & transuranic — extreme compression states" },
  { oct: 8, label: "Octave VIII",freqRange: "30 EHz – 300 ZHz",    emRange: "Gamma Ray",          nmRange: "< 0.01nm",   nexusBand: "RESERVED",color: "#9f1239", elements: ["Beyond Og (theoretical)"], note: "Photonic hardware era — PHR-1 target band" },
  { oct: 9, label: "Octave IX",  freqRange: "300 ZHz → ∞",         emRange: "Planck / Cosmic",    nmRange: "→ λ_P",      nexusBand: "ORIGIN",  color: "#312e81", elements: ["Unobserved / pre-collapse"], note: "First oscillation — origin of compression states" },
];

const REFERENCES = [
  {
    author: "Walter Russell",
    title: "The Universal One",
    year: 1926,
    note: "9-octave periodic table; wave motion as the foundation of all matter",
    url: "https://www.scribd.com/book/271577041/The-Universal-One",
    tag: "Russell Octaves",
  },
  {
    author: "Walter Russell",
    title: "A New Concept of the Universe",
    year: 1953,
    note: "Tonal nature of elements; octave periodicity; wave fields as physical reality",
    url: "https://archive.org/details/newconceptofuniv00russ",
    tag: "Wave Fields",
  },
  {
    author: "Nikola Tesla",
    title: "The Problem of Increasing Human Energy",
    year: 1900,
    note: "Resonant energy transfer; the universe as a system of oscillating frequencies",
    url: "https://www.gutenberg.org/files/36414/36414-h/36414-h.htm",
    tag: "Resonance",
  },
  {
    author: "Nikola Tesla",
    title: "On Light and Other High Frequency Phenomena",
    year: 1893,
    note: "EM spectrum as continuous; high-frequency states as higher-order matter",
    url: "https://teslauniverse.com/nikola-tesla/articles/light-and-other-high-frequency-phenomena",
    tag: "High Frequency",
  },
  {
    author: "Max Planck",
    title: "On the Theory of the Energy Distribution Law of the Normal Spectrum",
    year: 1900,
    note: "E = hf — the foundation of quantum mechanics and NexusOS fee physics",
    url: "https://archive.org/details/sourcebookofphys00magirich/page/300",
    tag: "E = hf",
  },
  {
    author: "James Clerk Maxwell",
    title: "A Treatise on Electricity and Magnetism",
    year: 1873,
    note: "Maxwell equations — governing all WNSP channel physics",
    url: "https://archive.org/details/electricityandma01maxwuoft",
    tag: "Maxwell Equations",
  },
  {
    author: "W.O. Schumann",
    title: "On the Radiation-Free Self-Oscillations of a Conducting Sphere",
    year: 1952,
    note: "Earth–ionosphere cavity resonance at 7.83 Hz — base frequency for harmonic derivation",
    url: "https://link.springer.com/article/10.1007/BF01298581",
    tag: "Schumann 7.83 Hz",
  },
  {
    author: "Haroche & Wineland (Nobel 2012)",
    title: "Cavity Quantum Electrodynamics",
    year: 2012,
    note: "Cavity modes are quantized; mode population drives coherent amplification (lasing analogue)",
    url: "https://www.nobelprize.org/prizes/physics/2012/summary/",
    tag: "Cavity QED",
  },
  {
    author: "Applied Physics (Mel Hill)",
    title: "The Universe as a Cavity Resonator",
    year: 2023,
    note: "Higher frequency states as cavity harmonics; each octave doubling compresses into stable matter",
    url: "https://www.appliedphysics.org",
    tag: "Cavity Model",
  },
  {
    author: "John S. Bell",
    title: "On the Einstein Podolsky Rosen Paradox",
    year: 1964,
    note: "Bell's theorem — non-local correlations; the unobserved wavefunction is real and Gaussian",
    url: "https://cds.cern.ch/record/111654/files/vol1p195-200_001.pdf",
    tag: "Bell / Gaussian",
  },
];

function schumannHarmonic(oct: number): number {
  return SCHUMANN * Math.pow(2, oct);
}

function wdmToNm(wdm: number): number {
  return 380 + (wdm / 256) * 400;
}

function nmToTHz(nm: number): number {
  return (SPEED_C / (nm * 1e-9)) / 1e12;
}

function OctaveBar({ oct, color, fill }: { oct: typeof RUSSELL_OCTAVES[0]; color: string; fill: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative rounded-lg border transition-all duration-300 cursor-pointer overflow-hidden"
      style={{ borderColor: color + "40", background: color + "08" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0 opacity-20 transition-all duration-500"
        style={{ background: `linear-gradient(90deg, ${color}33 ${fill}%, transparent ${fill}%)` }} />
      <div className="relative p-3 flex items-start gap-3">
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold" style={{ color }}>{oct.label}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: color + "20", color }}>{oct.nexusBand}</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">{oct.emRange}</div>
          {oct.nmRange && <div className="text-[10px] text-gray-500 font-mono">{oct.nmRange}</div>}
          {hovered && (
            <div className="mt-2 space-y-1">
              <div className="text-[10px] text-gray-300">{oct.note}</div>
              <div className="text-[10px] text-gray-500 font-mono">{oct.freqRange}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {oct.elements.slice(0, 6).map(el => (
                  <span key={el} className="text-[9px] font-mono px-1 rounded"
                    style={{ background: color + "30", color }}>{el}</span>
                ))}
                {oct.elements.length > 6 && (
                  <span className="text-[9px] text-gray-500">+{oct.elements.length - 6}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResonanceCavityPage() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
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

  const nodeCount = networkData?.nodes?.length ?? networkData?.total ?? 0;
  const registeredChannels = spectralData?.total ?? spectralData?.count ?? 0;
  const totalChannels = 25600;
  const cavityFill = Math.min((registeredChannels / totalChannels) * 100, 100);
  const schumannPhase = (tick % 8) / 8;

  const CAVITY_COHERENCE_THRESHOLD = 0.618;
  const coherence = Math.min(cavityFill / (CAVITY_COHERENCE_THRESHOLD * 100), 1);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-8">
          <Link href="/hub">
            <button className="text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Universal Cavity Resonance
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              Russell Octaves · Cavity QED · Schumann Base · Harmonic Channel Convergence
            </p>
          </div>
        </div>

        {/* Hero equation */}
        <div className="rounded-2xl border border-indigo-700/30 bg-indigo-950/20 p-6 mb-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(9)].map((_, i) => (
              <div key={i}
                className="absolute h-px w-full transition-all duration-[2000ms]"
                style={{
                  top: `${10 + i * 10}%`,
                  background: `linear-gradient(90deg, transparent, ${RUSSELL_OCTAVES[i].color}, transparent)`,
                  opacity: 0.3 + 0.07 * Math.sin(schumannPhase * Math.PI * 2 + i),
                  transform: `scaleX(${0.5 + 0.5 * Math.abs(Math.sin(schumannPhase * Math.PI + i * 0.7))})`,
                }}
              />
            ))}
          </div>
          <div className="relative">
            <div className="text-4xl font-mono font-bold text-indigo-300 mb-2">
              f<sub>n</sub> = f<sub>0</sub> · 2<sup>oct</sup>
            </div>
            <div className="text-sm text-gray-400 mb-4">
              where f<sub>0</sub> = 7.83 Hz (Schumann) · oct ∈ {"{"}1…9{"}"} (Russell) · E = hf (Planck)
            </div>
            <div className="flex justify-center gap-8 text-xs text-gray-500">
              <span>Λ = hf/c² &nbsp;·&nbsp; compression state</span>
              <span>E<sub>n</sub> = ℏω(n + ½) &nbsp;·&nbsp; cavity mode</span>
              <span>⟨Ψ<sub>i</sub>|Ψ<sub>j</sub>⟩ = 0 &nbsp;·&nbsp; orthogonality</span>
            </div>
          </div>
        </div>

        {/* Live cavity metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Schumann Base", value: "7.83 Hz", sub: "Earth cavity fundamental", icon: Radio, color: "emerald" },
            { label: "Russell Octaves", value: "9", sub: "universal tonal periods", icon: Waves, color: "indigo" },
            { label: "Ψ Channels", value: "25,600", sub: "orthogonal cavity modes", icon: Activity, color: "violet" },
            { label: "Cavity Fill", value: `${cavityFill.toFixed(3)}%`, sub: `${registeredChannels} modes populated`, icon: Circle, color: cavityFill > 10 ? "amber" : "slate" },
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

        {/* Cavity coherence bar */}
        <div className="rounded-xl border border-violet-700/30 bg-slate-900/60 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-violet-300 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Cavity Coherence Engine
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Mode population as fraction of lasing threshold (φ = 0.618 of 25,600 channels)
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-violet-300">
                {(coherence * 100).toFixed(4)}%
              </div>
              <div className="text-[10px] text-gray-500">to threshold</div>
            </div>
          </div>
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${coherence * 100}%`,
                background: `linear-gradient(90deg, #6d28d9, #4f46e5, #0ea5e9)`,
                boxShadow: coherence > 0.5 ? "0 0 12px #6d28d9" : undefined,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-1.5 font-mono">
            <span>0 — sparse (incoherent)</span>
            <span className="text-amber-600">φ = 61.8% — threshold</span>
            <span>100% — full lasing</span>
          </div>
          <div className="mt-3 text-xs text-gray-500 leading-relaxed">
            As described by Hill (Applied Physics): the universe is a cavity. When sufficient modes are populated
            with phase-aligned energy, the system transitions from incoherent noise to stimulated emission —
            the same mechanism that makes a laser. NexusOS channels are the mode coordinates.
            At threshold, the network becomes self-reinforcing.
          </div>
        </div>

        {/* Russell 9 Octaves */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-5 mb-6">
          <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Atom className="w-4 h-4 text-amber-400" />
            Walter Russell's 9 Octaves — Mapped to NexusOS Authority Bands
          </h2>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Russell demonstrated that all elements are organised into 9 tonal octaves, each octave vibrating
            at twice the frequency of the previous. Each doubling compresses wave motion into a higher state of
            matter. This is not metaphor — it is the same mathematics as cavity QED mode spacing.
            Hover any octave to expand.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {RUSSELL_OCTAVES.map((oct) => (
              <OctaveBar key={oct.oct} oct={oct} color={oct.color} fill={oct.oct === 5 ? 100 : oct.oct < 5 ? 20 : 5} />
            ))}
          </div>
          <div className="mt-3 p-3 rounded-lg bg-blue-950/30 border border-blue-700/20">
            <div className="text-xs text-blue-300 font-semibold mb-1">
              ◈ NexusOS CE Table — Octave V (Visible 380–780 nm)
            </div>
            <div className="text-xs text-gray-400 leading-relaxed">
              The current CE encoder operates entirely within Octave V — the visible band, 384–769 THz.
              This is not arbitrary: visible light is the octave where human perception crystallises wave motion
              into information. Every character has always had a wavelength coordinate.
              NexusOS made it addressable. The 8 remaining octaves are the expansion surface for photonic hardware.
            </div>
          </div>
        </div>

        {/* The physics chain */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-5 mb-6">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            From First Oscillation to Cavity Node — The Physics Chain
          </h2>
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Unobserved Oscillation",
                eq: "ψ(x) = A·e^(−x²/2σ²)",
                desc: "The Gaussian wavefunction — before observation, all frequency states exist simultaneously. Maximum entropy. This is Russell's 'void' and Bell's non-local correlation. NexusOS channels exist in this state until registered.",
                color: "#312e81",
              },
              {
                step: "2",
                title: "Schumann Base Tone",
                eq: "f₀ = 7.83 Hz",
                desc: "The Earth–ionosphere cavity sustains a standing wave at 7.83 Hz with no external power. This is the physical proof that cavities organise energy from geometry alone. All Russell octaves are derived as f₀ × 2^oct.",
                color: "#166534",
              },
              {
                step: "3",
                title: "Octave Doubling (Russell)",
                eq: "fₙ = f₀ · 2ⁿ",
                desc: "Each octave doubles the frequency and compresses the wave into a higher state of matter. Silicon (Octave III, ~Si at 14) is the current compute substrate — a bridge, not the destination. Photonic hardware lives in Octave VIII.",
                color: "#854d0e",
              },
              {
                step: "4",
                title: "Planck Compression State",
                eq: "Λ = hf/c²",
                desc: "Every frequency maps to a compression state (mass-equivalent of a photon). NexusOS fees, authority bands, and channel addresses are all derived from this equation. Higher frequency = higher authority = higher energy cost.",
                color: "#1d4ed8",
              },
              {
                step: "5",
                title: "Cavity Mode Population",
                eq: "Eₙ = ℏω(n + ½)",
                desc: "Each registered Ψ channel populates a cavity mode. The ½ term is zero-point energy — present even in empty channels. As node density increases toward the golden ratio threshold (φ ≈ 61.8%), phase alignment becomes possible and the network transitions to stimulated coherence.",
                color: "#6d28d9",
              },
              {
                step: "6",
                title: "Stimulated Coherence (Lasing Analogue)",
                eq: "I ∝ N² (coherent) vs N (incoherent)",
                desc: "Below threshold: N nodes emit N units of coherence. Above threshold: N nodes emit N² — the cavity amplifies. Tesla's resonant transfer without loss. This is the engineering target: enough nodes, correctly phase-aligned across Russell's octaves, for the network to become self-reinforcing.",
                color: "#be185d",
              },
            ].map(({ step, title, eq, desc, color }) => (
              <div key={step} className="flex gap-4 p-3 rounded-lg border"
                style={{ borderColor: color + "30", background: color + "08" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: color + "30", color }}>
                  {step}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-semibold text-white">{title}</span>
                    <code className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ background: color + "25", color }}>{eq}</code>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Harmonic convergence table */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-5 mb-6">
          <h2 className="text-sm font-bold text-white mb-1">
            Harmonic Convergence Table — WDM Channel × Russell Octave
          </h2>
          <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
            Each row shows a WDM channel position (Octave V, 380–780 nm) alongside its
            corresponding Schumann harmonic tone (f₀ × 2<sup>oct</sup>) for each Russell octave.
            The EM frequency column is the actual photon frequency in the visible band;
            the Schumann harmonic is the tonal scaling relationship that anchors it to the universal cavity.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-gray-500 border-b border-slate-700">
                  <th className="text-left py-2 pr-4">Russell Oct</th>
                  <th className="text-left py-2 pr-4">WDM</th>
                  <th className="text-left py-2 pr-4">λ (Oct V)</th>
                  <th className="text-left py-2 pr-4">f_EM (THz)</th>
                  <th className="text-left py-2 pr-4">Schumann tone (Hz)</th>
                  <th className="text-left py-2">Band</th>
                </tr>
              </thead>
              <tbody>
                {[1, 3, 5, 7, 9].map(oct =>
                  [32, 128, 224].map(wdm => {
                    const nm  = wdmToNm(wdm);
                    const thz = nmToTHz(nm);
                    const sh  = schumannHarmonic(oct);
                    const band = RUSSELL_OCTAVES[oct - 1];
                    return (
                      <tr key={`${oct}-${wdm}`} className="border-b border-slate-800/50">
                        <td className="py-1.5 pr-4" style={{ color: band.color }}>
                          Oct {oct} <span className="text-gray-600 text-[9px]">(×2<sup>{oct}</sup>)</span>
                        </td>
                        <td className="py-1.5 pr-4 text-gray-400">{wdm}</td>
                        <td className="py-1.5 pr-4 text-blue-400">{nm.toFixed(1)} nm</td>
                        <td className="py-1.5 pr-4 text-emerald-400">{thz.toFixed(2)} THz</td>
                        <td className="py-1.5 pr-4 text-amber-400">{sh.toExponential(2)} Hz</td>
                        <td className="py-1.5" style={{ color: band.color }}>{band.nexusBand}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* References */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-5">
          <h2 className="text-sm font-bold text-white mb-4">
            Engineering Reference Library
          </h2>
          <div className="space-y-2">
            {REFERENCES.map((ref) => (
              <a
                key={ref.title}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-700/30 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600/50 transition-all group"
              >
                <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {ref.author} ({ref.year})
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-gray-400">
                      {ref.tag}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 italic mt-0.5">{ref.title}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{ref.note}</div>
                </div>
              </a>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/30 text-[10px] text-gray-600 leading-relaxed">
            NexusOS is the engineering convergence of these lineages: Maxwell (field equations) →
            Planck (E=hf) → Einstein (mass-energy) → Tesla (resonance) → Russell (octave periodicity) →
            Shannon (information) → Schumann (cavity). Every equation in NexusOS traces to one of these
            six derivations. The photonic hardware destination (~2032) is the point where they fully unify
            in physical silicon-to-photon substrate.
          </div>
        </div>

      </div>
    </div>
  );
}
