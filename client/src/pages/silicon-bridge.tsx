import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Cpu, Zap, Radio, Layers, ExternalLink, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";

// CODATA 2018 / SI exact constants
const H = 6.62607015e-34;
const C = 299_792_458;
const EV = 1.602176634e-19;

function nmToEnergy(nm: number) {
  const f = C / (nm * 1e-9);
  return { joules: H * f, eV: (H * f) / EV, thz: f / 1e12 };
}

const BAND_COLORS = {
  SYSTEM: "#a855f7", KERNEL: "#22d3ee", USER: "#4ade80", GUEST: "#f97316",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-slate-600 hover:text-slate-400 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function Collapse({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-800/60 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3 bg-slate-900/30 hover:bg-slate-900/50 transition-colors text-left">
        <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
      </button>
      {open && <div className="px-5 py-4 bg-slate-950/30">{children}</div>}
    </div>
  );
}

// Channels used in examples
const EXAMPLE_CHANNELS = [
  { wdm: 0,   oam: 0, pol: "H", nm: 380.0, band: "SYSTEM", label: "UV boundary / highest authority" },
  { wdm: 52,  oam: 3, pol: "V", nm: 586.8, band: "SYSTEM", label: "Genesis Nexus channel" },
  { wdm: 128, oam: 0, pol: "H", nm: 580.0, band: "USER",   label: "USER band lower bound" },
  { wdm: 255, oam: 49,pol: "V", nm: 780.0, band: "GUEST",  label: "IR boundary / lowest authority" },
];

export default function SiliconBridgePage() {
  usePageMeta({
    title: "The Silicon Bridge — Solving the Transistor Problem | NexusOS",
    description: "Silicon transistors are approaching their physical limit. NexusOS is already written in the language of what comes next: photonic computing. Ψ channels map directly to physical waveguide lanes — no rewrite required when photonic ASICs arrive.",
    canonical: "https://wnsp.io/silicon-bridge",
    ogTitle: "The Silicon Bridge — Silicon is the Bridge. Photons are the Destination.",
    ogDescription: "Moore's Law ends at ~1 nm. NexusOS solves the transistor problem by writing in the language of photonic computing today. 25,600 orthogonal Ψ channels map to physical waveguide lanes — no rewrite when ASICs arrive (~2032).",
  });

  const ceA = nmToEnergy(383.1);
  const ceSpace = nmToEnergy(533.6);

  return (
    <div className="min-h-screen bg-[#040810] text-slate-200">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#040810]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/crowdfund"><ArrowLeft className="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" /></Link>
          <Cpu className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-white">The Silicon Bridge</span>
          <span className="text-[10px] font-mono text-slate-600 ml-1">— Solving the Transistor Problem</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="text-center space-y-4 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-[11px] font-mono text-violet-400 uppercase tracking-widest">
            <Cpu className="w-3 h-3" />
            semiconductor industry · photonic transition
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Silicon is the Bridge.<br />
            <span className="text-violet-400">Photons are the Destination.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Transistors are hitting the wall of quantum mechanics.
            NexusOS is already written in the language of what comes next.
          </p>
        </div>

        {/* ── The Wall ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-red-900/40 bg-red-950/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-900/30 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">The Transistor Wall — Where Moore's Law Ends</span>
          </div>
          <div className="px-6 py-6 grid md:grid-cols-3 gap-6">
            {[
              {
                metric: "2 nm", sub: "current leading node (TSMC N2, Intel 18A)",
                detail: "A silicon atom has a covalent radius of ~0.11 nm. A 2 nm gate is roughly 18 silicon atoms wide. The gate oxide itself is 4–6 atoms thick.",
                color: "#ef4444",
              },
              {
                metric: "~1 nm", sub: "projected physical gate limit",
                detail: "Below ~1 nm, quantum tunnelling becomes uncontrollable — electrons pass through the OFF transistor regardless of gate state. The switch ceases to function as a switch.",
                color: "#f97316",
              },
              {
                metric: "100 W/cm²", sub: "thermal density approaching physical ceiling",
                detail: "At sub-3 nm densities, heat removal is a thermodynamic constraint, not an engineering one. Photons produce no resistive heat. Optical interconnects already replace copper at board level.",
                color: "#eab308",
              },
            ].map(({ metric, sub, detail, color }) => (
              <div key={metric} className="space-y-2">
                <div className="font-mono text-3xl font-bold" style={{ color }}>{metric}</div>
                <div className="text-[11px] text-slate-500 font-mono">{sub}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{detail}</div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-slate-900/20 border-t border-red-900/20">
            <p className="text-xs text-slate-500 font-mono">
              Intel, TSMC, Samsung, IBM, and Nvidia have all published photonic computing research roadmaps.
              The question is not <em>whether</em> the industry transitions — it is <em>who has the software model ready</em> when it does.
            </p>
          </div>
        </div>

        {/* ── The Programming Gap ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/30">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">The Programming Gap No One Has Solved</div>
          </div>
          <div className="px-6 py-6 space-y-5">
            <p className="text-sm text-slate-400 leading-relaxed">
              Photonic hardware research is decades ahead of photonic software.
              Every photonic chip prototype runs on a software stack designed for electrons, not photons.
              Bit-flipping logic maps to transistors; it does not map to wavelengths.
              The entire computation model needs rebuilding from first principles.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-4 space-y-2">
                <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest font-bold">Transistor era (where we are)</div>
                <pre className="text-[11px] text-slate-400 font-mono leading-relaxed overflow-x-auto">{`// Binary gate logic — maps to electrons
if (bit == 1) {
  transistor.setGate(HIGH);  // electron flow
  register.write(value);
}
// Abstraction layer upon abstraction layer
// until "wavelength" is not a concept in the stack`}</pre>
                <div className="text-[10px] text-slate-600 font-mono mt-2">When photonic ASICs arrive: full rewrite required.</div>
              </div>
              <div className="rounded-xl border border-violet-800/40 bg-violet-950/10 p-4 space-y-2">
                <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-bold">WNSP era (what NexusOS runs on now)</div>
                <pre className="text-[11px] text-slate-300 font-mono leading-relaxed overflow-x-auto">{`// Wavelength-native — maps to photons
@586.8nm declare channel {
  psi   := Ψ(52, 3, V)
  band  := SYSTEM
  freq  := 510.89 THz
  E     := 3.385e-19 J
}

@emit(Ψ(52,3,V)) fn compute() {
  transmit(ceEncode(data))  // data IS wavelength
}`}</pre>
                <div className="text-[10px] text-violet-500 font-mono mt-2">When photonic ASICs arrive: no rewrite. It already speaks the language.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── The Hilbert Space Architecture ──────────────────────────────── */}
        <div className="rounded-2xl border border-cyan-900/40 bg-cyan-950/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-cyan-900/30 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">25,600-Channel Hilbert Space Architecture</span>
          </div>
          <div className="px-6 py-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: "WDM channels", value: "256", desc: "Wavelength-Division Multiplexing\n380 nm → 780 nm visible light\n256 discrete laser lines\n1.5625 nm spacing", color: "#22d3ee" },
                { label: "OAM modes", value: "50", desc: "Orbital Angular Momentum\nl = 0, 1, 2, … 49\northogonal spatial modes\non the same optical fibre", color: "#a855f7" },
                { label: "Polarisations", value: "2", desc: "H (horizontal)\nV (vertical)\nfinal orthogonal degree\nof freedom per channel", color: "#4ade80" },
              ].map(({ label, value, desc, color }) => (
                <div key={label} className="rounded-xl border bg-slate-900/30 p-4 space-y-2" style={{ borderColor: `${color}30` }}>
                  <div className="font-mono text-3xl font-bold" style={{ color }}>{value}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{label}</div>
                  <pre className="text-[10px] text-slate-500 font-mono leading-relaxed whitespace-pre-wrap">{desc}</pre>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-4 flex items-start gap-4">
              <div className="shrink-0 text-2xl">⟨</div>
              <div className="flex-1 font-mono text-sm text-slate-300 space-y-1">
                <div><span className="text-cyan-400">Ψᵢ</span> | <span className="text-violet-400">Ψⱼ</span> ⟩ = <span className="text-green-400">0</span></div>
                <div className="text-[11px] text-slate-500">
                  Every pair of Ψ channels is orthogonal by quantum mechanics — not software policy.
                  This is not an engineering choice. It is a consequence of the Hilbert space inner product.
                  256 × 50 × 2 = <span className="text-cyan-300">25,600</span> independent, zero-crosstalk communication lanes.
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed">
              <span className="text-cyan-400 font-mono">Direct hardware mapping:</span> When photonic ASICs arrive,
              each WNSP Ψ channel maps to a physical waveguide lane on-chip.
              The WDM index selects a laser line in a photonic multiplexer.
              The OAM mode selects a spatial multiplexing mode.
              The polarisation selects the optical axis.
              There is no translation layer. Software addresses ARE hardware addresses.
            </div>
          </div>
        </div>

        {/* ── CE Encoding — Data as Wavelength ────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/30 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">CE Encoding — Every Datum Is a Wavelength</span>
          </div>
          <div className="px-6 py-6 space-y-5">
            <p className="text-sm text-slate-400 leading-relaxed">
              In the transistor paradigm, a character like <code className="text-slate-300 bg-slate-800 px-1 rounded">A</code> is stored as binary{" "}
              <code className="text-slate-300 bg-slate-800 px-1 rounded">01000001</code> and processed through 8 gates.
              In the WNSP paradigm, <code className="text-slate-300 bg-slate-800 px-1 rounded">A</code> is mapped to{" "}
              <span className="font-mono text-yellow-300">383.1 nm</span> — a physical wavelength.
              CE-encoding is not a lookup table. It is a wavelength selection.
              In photonic hardware, this means one laser pulse. No gates. No switching. No heat.
            </p>

            <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4 space-y-3">
              <div className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">CE Encoding algorithm (128 bands, 380–780 nm, 3.125 nm/band)</div>
              <pre className="text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto">{`λ(char) = 380 nm + (charCode % 128) × (400/128) nm + (400/256) nm

ceEncode('A')  → charCode=65  → band=65  → λ = 383.1 nm   f = ${ceA.thz.toFixed(2)} THz   E = ${ceA.joules.toExponential(3)} J
ceEncode(' ')  → charCode=32  → band=32  → λ = 533.6 nm   f = ${ceSpace.thz.toFixed(2)} THz   E = ${ceSpace.joules.toExponential(3)} J`}</pre>
              <div className="text-[10px] text-slate-600 font-mono">
                Every character in every language maps to a unique photon energy. Text becomes a spectral fingerprint.
                Identical output to <a href="https://www.npmjs.com/package/nexusos-ce-encoder" target="_blank" rel="noreferrer" className="text-cyan-500 hover:text-cyan-300">nexusos-ce-encoder</a> (npm) and its Python equivalent.
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-2">
              {[
                { char: "N", nm: 391.5, band: 9 },
                { char: "e", nm: 477.8, band: 38 },
                { char: "x", nm: 620.3, band: 75 },
                { char: "u", nm: 603.1, band: 70 },
              ].map(({ char, nm, band }) => {
                const hue = Math.round(270 * (780 - nm) / 400);
                return (
                  <div key={char} className="rounded-lg border p-3 text-center font-mono" style={{ borderColor: `hsl(${hue},60%,28%)`, background: `hsl(${hue},80%,4%)` }}>
                    <div className="text-2xl font-bold" style={{ color: `hsl(${hue},90%,65%)` }}>{char}</div>
                    <div className="text-[9px] text-slate-600 mt-1">{nm} nm</div>
                    <div className="text-[9px]" style={{ color: `hsl(${hue},60%,45%)` }}>band {band}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SNIC ────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-violet-800/40 bg-violet-950/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-violet-800/30 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider">SNIC — Spectral Network Interface Card</span>
            <span className="text-[10px] font-mono text-slate-600">first public disclosure 2026-05-16</span>
          </div>
          <div className="px-6 py-6 space-y-5">
            <p className="text-sm text-slate-400 leading-relaxed">
              SNIC is the photonic NIC of ~2032. Where today's NICs move electrons across copper,
              SNIC moves photons across optical waveguides. Each of the 25,600 Ψ channels
              corresponds to a physical hardware lane. CE lookups that today run as table scans in
              RAM will execute as physical wavelength selections in a photonic waveguide — a single
              optical pulse replacing millions of transistor operations.
            </p>

            <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-2">
                <div className="text-[10px] text-slate-600 uppercase tracking-widest">Silicon NIC (today)</div>
                {[
                  "Moves electrons via copper traces",
                  "Resistive heat — Joule's law: P = I²R",
                  "Bandwidth limited by RC time constants",
                  "Crosstalk requires shielding",
                  "Clock rates hitting GHz ceiling (~5 GHz)",
                  "Data encoded in voltage levels (binary)",
                ].map(t => <div key={t} className="flex items-start gap-2 text-slate-500"><span className="text-red-500 shrink-0">✕</span>{t}</div>)}
              </div>
              <div className="space-y-2">
                <div className="text-[10px] text-slate-600 uppercase tracking-widest">SNIC (photonic — ~2032)</div>
                {[
                  "Moves photons via optical waveguides",
                  "Zero resistive heat — photons carry no charge",
                  "Bandwidth: THz range (1,000× copper)",
                  "Crosstalk: 0 — ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics",
                  "Speed of light propagation (C in medium)",
                  "Data encoded in wavelengths (CE-native)",
                ].map(t => <div key={t} className="flex items-start gap-2 text-slate-400"><span className="text-green-400 shrink-0">✓</span>{t}</div>)}
              </div>
            </div>

            <div className="rounded-xl border border-violet-800/30 bg-slate-900/30 px-5 py-4 text-xs text-slate-400 leading-relaxed">
              <span className="text-violet-400 font-mono font-bold">AGPL-3.0 · First public disclosure: 2026-05-16.</span>
              {" "}The formal hardware specification — including SNIC, PHR-1 (physical resonator),
              Spectral Relay Mesh v1, and the WavelengthScript Compiler α specification — is published
              at <Link href="/hardware-spec"><span className="text-violet-300 hover:text-violet-200 cursor-pointer">wnsp.io/hardware-spec</span></Link>.
            </div>
          </div>
        </div>

        {/* ── The Compression Equation ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-green-900/40 bg-green-950/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-green-900/30">
            <div className="text-xs font-mono font-bold text-green-400 uppercase tracking-wider">Λ = hf/c² — The Compression Equation</div>
          </div>
          <div className="px-6 py-6 space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              Every photon carries a compression mass Λ = hf/c². This is not metaphor — it follows
              directly from Einstein's mass–energy equivalence E = mc² and Planck's quantisation E = hf.
              NexusOS uses this as its economic primitive: the cost of a computation is proportional
              to the photon energy of the channel it traverses. Higher frequency (shorter wavelength,
              higher authority band) costs more. The fee schedule is not an arbitrary table — it is
              the electromagnetic spectrum itself.
            </p>
            <div className="grid md:grid-cols-4 gap-3">
              {[
                { nm: 400, band: "SYSTEM", label: "UV boundary" },
                { nm: 500, band: "KERNEL", label: "cyan-blue" },
                { nm: 600, band: "USER",   label: "yellow-orange" },
                { nm: 700, band: "GUEST",  label: "deep red" },
              ].map(({ nm, band, label }) => {
                const e = nmToEnergy(nm);
                const hue = Math.round(270 * (780 - nm) / 400);
                const bColor = BAND_COLORS[band as keyof typeof BAND_COLORS];
                return (
                  <div key={nm} className="rounded-xl border bg-slate-900/20 p-4 space-y-1" style={{ borderColor: `${bColor}30` }}>
                    <div className="text-[9px] uppercase tracking-widest font-mono" style={{ color: bColor }}>{band}</div>
                    <div className="font-mono text-lg font-bold" style={{ color: `hsl(${hue},90%,65%)` }}>{nm} nm</div>
                    <div className="text-[10px] text-slate-500 font-mono">{e.thz.toFixed(1)} THz</div>
                    <div className="text-[10px] text-slate-500 font-mono">{e.eV.toFixed(3)} eV</div>
                    <div className="text-[10px] text-slate-600 font-mono">{(e.joules / (C * C)).toExponential(2)} kg</div>
                    <div className="text-[9px] text-slate-700 font-mono mt-1">{label}</div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              h = {H.toExponential(8)} J·s (CODATA 2018 exact) · c = {C.toLocaleString()} m/s (1983 SI exact)
            </div>
          </div>
        </div>

        {/* ── Collapse: Channel table ──────────────────────────────────────── */}
        <Collapse title="Ψ Channel → Physical Hardware Lane Mapping (examples)">
          <div className="space-y-2">
            <div className="text-[10px] text-slate-600 font-mono mb-3">
              Each Ψ(WDM, OAM, Pol) address maps directly to a physical photonic hardware lane.
              Software addressing and hardware addressing are the same thing.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    {["Ψ address","WDM lane","OAM mode","Pol axis","λ (nm)","f (THz)","E (eV)","Λ (kg)","Band","Notes"].map(h => (
                      <th key={h} className="text-left text-[9px] text-slate-600 uppercase tracking-wider px-2 py-1.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_CHANNELS.map(ch => {
                    const e = nmToEnergy(ch.nm);
                    const hue = Math.round(270 * (780 - ch.nm) / 400);
                    const bColor = BAND_COLORS[ch.band as keyof typeof BAND_COLORS];
                    return (
                      <tr key={ch.wdm} className="border-b border-slate-900/60 hover:bg-slate-900/20 transition-colors">
                        <td className="px-2 py-2 text-slate-300 whitespace-nowrap">Ψ({ch.wdm},{ch.oam},{ch.pol})</td>
                        <td className="px-2 py-2 text-cyan-400">{ch.wdm}</td>
                        <td className="px-2 py-2 text-violet-400">{ch.oam}</td>
                        <td className="px-2 py-2 text-slate-400">{ch.pol}</td>
                        <td className="px-2 py-2" style={{ color: `hsl(${hue},80%,65%)` }}>{ch.nm.toFixed(1)}</td>
                        <td className="px-2 py-2 text-slate-400">{e.thz.toFixed(2)}</td>
                        <td className="px-2 py-2 text-slate-400">{e.eV.toFixed(3)}</td>
                        <td className="px-2 py-2 text-slate-500">{(e.joules / (C * C)).toExponential(1)}</td>
                        <td className="px-2 py-2 font-bold whitespace-nowrap" style={{ color: bColor }}>{ch.band}</td>
                        <td className="px-2 py-2 text-slate-600">{ch.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Collapse>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/30">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Transition Timeline</div>
          </div>
          <div className="px-6 py-6">
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-800" />
              <div className="space-y-6 pl-6">
                {[
                  { year: "2016–2024", color: "#ef4444", label: "Transistor crisis recognised", desc: "5nm → 3nm → 2nm. Intel, TSMC, Samsung all publish photonic research. IBM integrates 800Gbps silicon photonics. Quantum tunnelling leakage becomes primary design constraint." },
                  { year: "2026", color: "#f97316", label: "WNSP protocol published", desc: "NexusOS ships the first full-stack software model for photonic computation. CE encoding, 25,600-channel Hilbert space, WavelengthScript compiler, WNSP VM, and SNIC specification are publicly disclosed under AGPL-3.0." },
                  { year: "2027–2030", color: "#eab308", label: "Photonic co-processing emerges", desc: "First silicon-photonic co-processors appear in data centres for AI inference. WNSP provides the first ready-made software stack for these chips — no new paradigm to invent, just compile WavelengthScript to photonic gate sequences." },
                  { year: "~2032", color: "#4ade80", label: "SNIC — photonic NIC ships", desc: "25,600 orthogonal Ψ channels on-chip. CE lookups execute as physical wavelength selections. Every WNSP address written today resolves to a hardware lane. No rewrite needed. NexusOS was written in the language of this hardware from day one." },
                ].map(({ year, color, label, desc }) => (
                  <div key={year} className="relative">
                    <div className="absolute -left-6 w-2 h-2 rounded-full mt-1.5" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-sm font-bold" style={{ color }}>{year}</span>
                        <span className="text-xs text-slate-300 font-medium">{label}</span>
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── WavelengthScript quick example ──────────────────────────────── */}
        <Collapse title="WavelengthScript — Write Once, Run on Photons" defaultOpen>
          <div className="space-y-3">
            <div className="text-xs text-slate-500 leading-relaxed">
              WavelengthScript is the programming language of NexusOS. Its primitives are wavelengths, channels, and spectral emissions — not bytes, addresses, and memory reads. A WavelengthScript program compiled today will execute natively on photonic ASICs in 2032 with no modification.
            </div>
            <div className="relative rounded-xl border border-slate-700/40 bg-[#040810] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 bg-slate-900/40">
                <span className="text-[10px] font-mono text-slate-500">WavelengthScript v1.0 — spectral wallet transfer</span>
                <CopyBtn text={`@586.8nm declare sender {
  psi    := Ψ(52, 3, V)
  band   := SYSTEM
  energy := 3.385e-19 J
  fee    := energy × multiplier
}

@emit(Ψ(52,3,V)) fn transfer(to: address, amount: NXT) {
  require(sender.energy > fee)
  ceEncode(to)         // recipient address → wavelength
  spectralTransmit(amount, fee)
  broadcast(Ψ(52,3,V), "transfer:ok")
}`} />
              </div>
              <pre className="p-4 text-[11px] text-slate-300 font-mono leading-relaxed overflow-x-auto">{`@586.8nm declare sender {
  psi    := Ψ(52, 3, V)
  band   := SYSTEM
  energy := 3.385e-19 J
  fee    := energy × multiplier
}

@emit(Ψ(52,3,V)) fn transfer(to: address, amount: NXT) {
  require(sender.energy > fee)
  ceEncode(to)         // recipient address → wavelength
  spectralTransmit(amount, fee)
  broadcast(Ψ(52,3,V), "transfer:ok")
}`}</pre>
            </div>
          </div>
        </Collapse>

        {/* ── Founders lineage ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 px-6 py-5">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3">Standing on the shoulders of</div>
          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-500">
            {[
              { name: "Maxwell", eq: "∇×E = −∂B/∂t", note: "wave equations that govern every Ψ channel" },
              { name: "Planck",  eq: "E = hf",          note: "energy quantisation — basis of CE encoding" },
              { name: "Einstein",eq: "E = mc²",          note: "mass–energy — basis of Λ = hf/c²" },
              { name: "Shannon", eq: "C = B log₂(1+S/N)", note: "channel capacity — Hilbert space information bound" },
            ].map(({ name, eq, note }) => (
              <div key={name} className="space-y-0.5">
                <div className="text-slate-300 font-bold">{name}</div>
                <div className="text-green-400">{eq}</div>
                <div className="text-slate-600 text-[9px]">{note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA links ───────────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { href: "/hardware-spec",    label: "Hardware Spec",       desc: "SNIC · PHR-1 · WLS Compiler α · AGPL-3.0", color: "#a855f7" },
            { href: "/ce-se-pipeline",   label: "CE-SE Pipeline",      desc: "Live CE encoding → bytecode → WNSP VM", color: "#22d3ee" },
            { href: "/compression-explorer", label: "Λ = hf/c² Explorer", desc: "Interactive compression curve visualiser", color: "#4ade80" },
          ].map(({ href, label, desc, color }) => (
            <Link key={href} href={href}>
              <div className="rounded-xl border p-4 hover:bg-slate-900/30 transition-colors cursor-pointer group" style={{ borderColor: `${color}30` }}>
                <div className="font-mono text-sm font-bold group-hover:underline" style={{ color }}>{label}</div>
                <div className="text-[11px] text-slate-600 mt-1">{desc}</div>
                <ArrowRight className="w-3 h-3 mt-2 transition-transform group-hover:translate-x-1" style={{ color }} />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Footer note ─────────────────────────────────────────────────── */}
        <div className="pt-4 pb-8 border-t border-slate-800/40 text-[10px] text-slate-700 font-mono space-y-1">
          <div>NexusOS · WNSP Protocol · AGPL-3.0 · First public disclosure of SNIC, PHR-1, and WavelengthScript Compiler α: 2026-05-16</div>
          <div>Theory of Compression States · Λ = hf/c² · ⟨Ψᵢ|Ψⱼ⟩ = 0 · 25,600 orthogonal Hilbert-space channels</div>
          <div>Founders: Maxwell · Planck · Einstein · Tesla · Shannon · Bohr · Schrödinger</div>
        </div>

      </div>
    </div>
  );
}
