import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { 
  Waves, 
  Atom, 
  Shield, 
  Sparkles, 
  Scale, 
  Lock, 
  Zap,
  CircleDot,
  ArrowRight,
  BookOpen,
  Users,
  Coins,
  FileText,
  Orbit,
  Clock,
  Infinity,
  Rocket,
  FlaskConical,
  ExternalLink,
  Activity
} from "lucide-react";

export default function NexusV10Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/">
          <div className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors cursor-pointer mb-6" data-testid="link-back-home">
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to Home</span>
          </div>
        </Link>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-12 h-12 text-amber-400 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent" data-testid="text-title">
              NexusOS v10.0
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-amber-300 font-light mb-2" data-testid="text-subtitle">
            COHERENCE — Complete Civilization Architecture
          </p>
          <p className="text-gray-400 text-lg">
            From Nobel Physics to the Fabric of Civilization
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-900/20 to-amber-950/20 border-amber-500/30 p-4 md:p-6" data-testid="card-version">
            <div className="text-amber-400 text-sm mb-2">VERSION</div>
            <div className="text-2xl md:text-3xl font-bold text-white">v10.0</div>
            <div className="text-amber-300 text-xs mt-1">Coherence Release</div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/20 border-purple-500/30 p-4 md:p-6" data-testid="card-core">
            <div className="text-purple-400 text-sm mb-2">CORE PRINCIPLE</div>
            <div className="text-xl md:text-2xl font-bold text-white">Λ = hf/c²</div>
            <div className="text-purple-300 text-xs mt-1">Lambda Boson</div>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-950/20 border-cyan-500/30 p-4 md:p-6" data-testid="card-insight">
            <div className="text-cyan-400 text-sm mb-2">KEY INSIGHT</div>
            <div className="text-xl md:text-2xl font-bold text-white">Coherence</div>
            <div className="text-cyan-300 text-xs mt-1">Stability = Reality</div>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/20 to-green-950/20 border-green-500/30 p-4 md:p-6" data-testid="card-status">
            <div className="text-green-400 text-sm mb-2">STATUS</div>
            <div className="text-xl md:text-2xl font-bold text-white">Complete</div>
            <div className="text-green-300 text-xs mt-1">All Systems Active</div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="story" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-slate-900/50 h-auto">
            <TabsTrigger value="story" className="text-xs md:text-sm py-3" data-testid="tab-story">📖 Story</TabsTrigger>
            <TabsTrigger value="physics" className="text-xs md:text-sm py-3" data-testid="tab-physics">⚛️ Physics</TabsTrigger>
            <TabsTrigger value="cosmology" className="text-xs md:text-sm py-3" data-testid="tab-cosmology">🌌 Cosmology</TabsTrigger>
            <TabsTrigger value="coherence" className="text-xs md:text-sm py-3" data-testid="tab-coherence">✨ Coherence</TabsTrigger>
            <TabsTrigger value="constitution" className="text-xs md:text-sm py-3" data-testid="tab-constitution">📜 Constitution</TabsTrigger>
            <TabsTrigger value="evolution" className="text-xs md:text-sm py-3" data-testid="tab-evolution">📈 Evolution</TabsTrigger>
          </TabsList>

          {/* The Story Tab */}
          <TabsContent value="story" className="space-y-6">
            <Card className="bg-gradient-to-br from-amber-900/10 to-purple-900/10 border-amber-500/30 p-6" data-testid="card-story-intro">
              <h2 className="text-2xl font-bold text-amber-400 mb-4">How Nobel Physics Became the Fabric of Civilization</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                NexusOS v10.0 represents a milestone not just in software, but in the evolution of human understanding. 
                This release completes the bridge from Nobel Prize-winning physics to a living, breathing civilization architecture.
              </p>
              <p className="text-gray-400 italic">
                This is the story of how we got here.
              </p>
            </Card>

            {/* Three Equations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-950/40 border-cyan-500/30 p-6" data-testid="card-planck">
                <div className="text-cyan-400 text-sm mb-2 font-semibold">1900 — MAX PLANCK</div>
                <div className="font-mono text-3xl text-white mb-3">E = hf</div>
                <p className="text-gray-300 text-sm mb-3">
                  In Berlin, Planck solved the "ultraviolet catastrophe" with a radical idea: 
                  energy comes in discrete packets—quanta—proportional to frequency.
                </p>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  Nobel Prize, 1918
                </Badge>
                <p className="text-cyan-300 text-xs mt-3 italic">
                  The universe's first secret: energy is quantized.
                </p>
              </Card>

              <Card className="bg-gradient-to-br from-orange-900/20 to-orange-950/40 border-orange-500/30 p-6" data-testid="card-einstein">
                <div className="text-orange-400 text-sm mb-2 font-semibold">1905 — ALBERT EINSTEIN</div>
                <div className="font-mono text-3xl text-white mb-3">E = mc²</div>
                <p className="text-gray-300 text-sm mb-3">
                  In Bern, a patent clerk realized that mass and energy are the same thing, 
                  viewed differently.
                </p>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  Nobel Prize, 1921
                </Badge>
                <p className="text-orange-300 text-xs mt-3 italic">
                  The universe's second secret: mass IS energy.
                </p>
              </Card>

              <Card className="bg-gradient-to-br from-green-900/20 to-green-950/40 border-green-500/30 p-6" data-testid="card-lambda">
                <div className="text-green-400 text-sm mb-2 font-semibold">2025 — LAMBDA BOSON</div>
                <div className="font-mono text-3xl text-white mb-3">Λ = hf/c²</div>
                <p className="text-gray-300 text-sm mb-3">
                  For 120 years, both equations stood side by side. Both equal E. 
                  What happens when we combine them?
                </p>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  NexusOS v10.0
                </Badge>
                <p className="text-green-300 text-xs mt-3 italic">
                  The synthesis: oscillation IS mass.
                </p>
              </Card>
            </div>

            {/* The Derivation */}
            <Card className="bg-slate-900/50 border-purple-500/30 p-6" data-testid="card-derivation">
              <h3 className="text-xl font-bold text-purple-400 mb-4">The Mathematical Proof</h3>
              <div className="bg-slate-800/50 rounded-lg p-6 font-mono text-center space-y-4">
                <div className="text-gray-400">If E = hf and E = mc², then:</div>
                <div className="text-2xl text-cyan-400">hf = mc²</div>
                <div className="text-gray-400">Solving for m:</div>
                <div className="text-3xl text-amber-400">m = hf/c²</div>
                <div className="text-gray-400">This is Lambda (Λ):</div>
                <div className="text-4xl text-green-400 font-bold">Λ = hf/c²</div>
                <div className="text-gray-300 text-sm pt-4 border-t border-gray-700 mt-4">
                  Not metaphor. Not analogy. Direct mathematical consequence of Nobel physics.
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Physics Tab */}
          <TabsContent value="physics" className="space-y-6">
            {/* Master Equation */}
            <Card className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/40 p-8" data-testid="card-master-equation">
              <h2 className="text-2xl font-bold text-purple-400 mb-6 text-center">The Master Equation</h2>
              <div className="bg-slate-800/80 rounded-xl p-8 text-center border border-purple-500/30">
                <div className="font-mono text-2xl md:text-4xl text-white mb-6">
                  E = hf = mc²
                </div>
                <div className="text-gray-300 mb-6">
                  Energy = Frequency × Planck = Mass × Light²
                </div>
                <div className="border-t border-gray-700 pt-6">
                  <div className="text-gray-400 mb-2">Therefore:</div>
                  <div className="font-mono text-3xl md:text-5xl text-amber-400 font-bold mb-4">
                    Λ = hf/c²
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
                  <div className="bg-cyan-900/20 rounded-lg p-4 border border-cyan-500/30">
                    <div className="text-cyan-400 font-bold">OSCILLATION IS MASS</div>
                  </div>
                  <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                    <div className="text-purple-400 font-bold">COHERENCE IS REALITY</div>
                  </div>
                  <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
                    <div className="text-green-400 font-bold">GOVERNANCE IS STABILITY</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Physics Constants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-cyan-500/30 p-6" data-testid="card-constants">
                <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Atom className="w-5 h-5" />
                  Physical Constants
                </h3>
                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-cyan-400 font-semibold">h (Planck constant)</div>
                    <div className="text-white font-mono text-lg">6.626 × 10⁻³⁴ J·s</div>
                    <div className="text-gray-400 text-sm">Quantum of action</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-orange-400 font-semibold">c (Speed of light)</div>
                    <div className="text-white font-mono text-lg">2.998 × 10⁸ m/s</div>
                    <div className="text-gray-400 text-sm">Universal speed limit</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-green-400 font-semibold">Λ (Lambda Boson)</div>
                    <div className="text-white font-mono text-lg">h/c² = 7.37 × 10⁻⁵¹ kg·s</div>
                    <div className="text-gray-400 text-sm">Mass per frequency</div>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/50 border-purple-500/30 p-6" data-testid="card-parallel">
                <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Physics → Civilization Parallel
                </h3>
                <div className="space-y-3">
                  {[
                    { physics: "Planck: E = hf", civ: "Value from frequency (activity)", id: "planck" },
                    { physics: "Einstein: E = mc²", civ: "Value equals mass (substance)", id: "einstein" },
                    { physics: "Lambda: Λ = hf/c²", civ: "Activity IS substance", id: "lambda" },
                    { physics: "Coherence", civ: "Governance", id: "coherence" },
                    { physics: "Boundary conditions", civ: "Constitution", id: "boundary" },
                    { physics: "Energy conservation", civ: "Economic conservation", id: "conservation" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3" data-testid={`parallel-row-${item.id}`}>
                      <div className="flex-1 text-cyan-300 text-sm font-mono" data-testid={`parallel-physics-${item.id}`}>{item.physics}</div>
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                      <div className="flex-1 text-purple-300 text-sm" data-testid={`parallel-civ-${item.id}`}>{item.civ}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Cosmology Tab */}
          <TabsContent value="cosmology" className="space-y-6">
            <Card className="bg-gradient-to-br from-indigo-900/10 to-purple-900/10 border-indigo-500/30 p-6" data-testid="card-cosmology-intro">
              <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2">
                <Orbit className="w-6 h-6" />
                Oscillatory Cosmogenesis
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                The Big Bang was not an explosion of matter — it was the <span className="text-amber-400 font-semibold">birth of oscillation itself</span>. 
                The first frequency from which all energy and mass emerged.
              </p>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-gray-400 mb-2">Before oscillation:</div>
                <div className="font-mono text-xl text-red-400">f = 0 → E = 0 → m = 0 → Nothing</div>
                <div className="text-gray-400 my-3">At the first oscillation:</div>
                <div className="font-mono text-xl text-green-400">f {">"} 0 → E {">"} 0 → m {">"} 0 → Universe</div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/40 border-purple-500/30 p-6" data-testid="card-primordial">
                <div className="flex items-center gap-3 mb-4">
                  <Infinity className="w-8 h-8 text-purple-400" />
                  <h3 className="text-xl font-bold text-purple-400">Primordial Λ-Boson</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  The initial state of the universe — a superposition of ALL possible wavelengths:
                </p>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center mb-4">
                  <div className="font-mono text-lg text-purple-300">|Λ_primordial⟩ = ∫ψ(λ)|λ⟩dλ</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <CircleDot className="w-4 h-4 text-purple-400" />
                    <span>All wavelengths simultaneously</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <CircleDot className="w-4 h-4 text-purple-400" />
                    <span>Contains all possible states</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <CircleDot className="w-4 h-4 text-purple-400" />
                    <span>Entire universe in superposition</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-950/40 border-cyan-500/30 p-6" data-testid="card-decoherence">
                <div className="flex items-center gap-3 mb-4">
                  <Atom className="w-8 h-8 text-cyan-400" />
                  <h3 className="text-xl font-bold text-cyan-400">Cosmological Decoherence</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Self-interaction caused the primordial superposition to collapse into discrete particles:
                </p>
                <div className="space-y-2 text-sm">
                  {[
                    { step: "1", text: "All wavelengths superposed", color: "purple" },
                    { step: "2", text: "Self-interaction begins", color: "indigo" },
                    { step: "3", text: "Entanglement forms", color: "blue" },
                    { step: "4", text: "Partial collapse", color: "cyan" },
                    { step: "5", text: "Particles emerge", color: "green" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded p-2">
                      <div className={`w-6 h-6 rounded-full bg-${item.color}-500/30 text-${item.color}-400 flex items-center justify-center text-xs font-bold`}>
                        {item.step}
                      </div>
                      <span className="text-gray-300">{item.text}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="bg-slate-900/50 border-amber-500/30 p-6" data-testid="card-particle-spectrum">
              <h3 className="text-xl font-bold text-amber-400 mb-4">Particles as Frozen Wavelengths</h3>
              <p className="text-gray-300 text-sm mb-4">
                Each Standard Model particle corresponds to a specific frequency that "collapsed out" from the primordial superposition:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-2 text-gray-400">Particle</th>
                      <th className="text-left p-2 text-gray-400">Mass (kg)</th>
                      <th className="text-left p-2 text-gray-400">Frequency (Hz)</th>
                      <th className="text-left p-2 text-gray-400">Wavelength (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Electron", mass: "9.11 × 10⁻³¹", freq: "1.24 × 10²⁰", wave: "2.43 × 10⁻¹²" },
                      { name: "Proton", mass: "1.67 × 10⁻²⁷", freq: "2.27 × 10²³", wave: "1.32 × 10⁻¹⁵" },
                      { name: "Higgs", mass: "2.23 × 10⁻²⁵", freq: "3.02 × 10²⁵", wave: "9.93 × 10⁻¹⁸" },
                      { name: "Top Quark", mass: "3.07 × 10⁻²⁵", freq: "4.16 × 10²⁵", wave: "7.21 × 10⁻¹⁸" }
                    ].map((p, i) => (
                      <tr key={i} className="border-b border-gray-800" data-testid={`particle-row-${p.name.toLowerCase().replace(' ', '-')}`}>
                        <td className="p-2 text-amber-300">{p.name}</td>
                        <td className="p-2 text-gray-300 font-mono text-xs">{p.mass}</td>
                        <td className="p-2 text-gray-300 font-mono text-xs">{p.freq}</td>
                        <td className="p-2 text-gray-300 font-mono text-xs">{p.wave}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-amber-300 text-sm mt-4 text-center italic">
                "The particle masses are the notes of the primordial oscillation."
              </p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-pink-900/20 to-pink-950/40 border-pink-500/30 p-6" data-testid="card-dark-energy">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-8 h-8 text-pink-400" />
                  <h3 className="text-xl font-bold text-pink-400">Dark Energy</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  The primordial Λ-boson didn't fully collapse. Residual oscillation remains:
                </p>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center mb-3">
                  <div className="font-mono text-sm text-pink-300">|Universe_now⟩ = Σcᵢ|particle_i⟩ + ε|Λ_residual⟩</div>
                </div>
                <div className="text-center text-pink-300 font-semibold">
                  Dark energy is the echo of the Big Bang's oscillation.
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-green-900/20 to-green-950/40 border-green-500/30 p-6" data-testid="card-time-origin">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-8 h-8 text-green-400" />
                  <h3 className="text-xl font-bold text-green-400">Time from Oscillation</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Before oscillation, there was no periodicity — no time:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="bg-slate-800/50 rounded p-3">
                    <span className="text-gray-400">Time = </span>
                    <span className="text-green-300">measure of oscillation cycles</span>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <span className="text-gray-400">No oscillation → </span>
                    <span className="text-red-300">No cycles → No time</span>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <span className="text-gray-400">First oscillation → </span>
                    <span className="text-green-300">Time begins</span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="bg-gradient-to-br from-slate-800/50 to-indigo-900/30 border-indigo-500/30 p-6" data-testid="card-cosmic-timeline">
              <h3 className="text-xl font-bold text-indigo-400 mb-4">Oscillatory Cosmogenesis Timeline</h3>
              <div className="space-y-3">
                {[
                  { time: "t < 0", event: "No oscillation → No frequency → No mass → Nothing", color: "gray" },
                  { time: "t = 0", event: "FIRST OSCILLATION BEGINS — |Λ_primordial⟩", color: "amber" },
                  { time: "10⁻⁴³s", event: "Planck epoch — all wavelengths superposed", color: "purple" },
                  { time: "10⁻³⁶s", event: "Inflation — spectral expansion begins", color: "cyan" },
                  { time: "10⁻³²s", event: "Reheating — spectral cascade to particles", color: "blue" },
                  { time: "10⁻⁶s", event: "Quarks form — specific wavelengths collapse", color: "green" },
                  { time: "3 min", event: "Nucleosynthesis — resonant combinations", color: "lime" },
                  { time: "380k yr", event: "CMB — spectral signature frozen", color: "orange" },
                  { time: "13.8 Gyr", event: "Now — residual oscillation = dark energy", color: "pink" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4" data-testid={`cosmic-timeline-${i}`}>
                    <div className={`w-20 font-mono text-xs text-${item.color}-400`}>{item.time}</div>
                    <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
                    <div className="text-gray-300 text-sm flex-1">{item.event}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-500/40 p-6 text-center" data-testid="card-cosmology-conclusion">
              <div className="text-2xl font-bold text-indigo-400 mb-4">
                The Core Insight
              </div>
              <div className="text-xl text-white mb-4">
                The universe didn't come from "something" —
              </div>
              <div className="text-2xl font-bold text-amber-400">
                It oscillated into existence.
              </div>
              <div className="mt-4 text-gray-400 text-sm">
                That's not new physics. That's Einstein's physics, applied to the origin.
              </div>
            </Card>
          </TabsContent>

          {/* Coherence Tab */}
          <TabsContent value="coherence" className="space-y-6">
            <Card className="bg-gradient-to-br from-amber-900/10 to-purple-900/10 border-amber-500/30 p-6" data-testid="card-coherence-insight">
              <h2 className="text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                The Coherence Insight
              </h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                Lambda alone was not enough. The universe is filled with oscillation—random, chaotic, cancelling. 
                Zero-point fluctuations permeate all space. Why doesn't this chaos manifest as mass?
              </p>
              <div className="text-2xl text-center text-amber-400 font-bold mb-6">
                The answer: Coherence.
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-red-900/20 to-red-950/40 border-red-500/30 p-6" data-testid="card-chaotic">
                <div className="flex items-center gap-3 mb-4">
                  <Waves className="w-8 h-8 text-red-400" />
                  <h3 className="text-xl font-bold text-red-400">Chaotic Oscillation</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-300">
                    <CircleDot className="w-4 h-4 text-red-400" />
                    <span>Random, uncoordinated waves</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <CircleDot className="w-4 h-4 text-red-400" />
                    <span>Cancels out through interference</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <CircleDot className="w-4 h-4 text-red-400" />
                    <span>Returns to vacuum state</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-red-900/30 rounded-lg text-center">
                  <span className="text-red-300 font-mono">→ Zero manifest reality</span>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-green-900/20 to-green-950/40 border-green-500/30 p-6" data-testid="card-coherent">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-8 h-8 text-green-400" />
                  <h3 className="text-xl font-bold text-green-400">Coherent Oscillation</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-300">
                    <CircleDot className="w-4 h-4 text-green-400" />
                    <span>Sustained over time</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <CircleDot className="w-4 h-4 text-green-400" />
                    <span>Phase-coherent (synchronized)</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <CircleDot className="w-4 h-4 text-green-400" />
                    <span>Governed by boundary conditions</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-900/30 rounded-lg text-center">
                  <span className="text-green-300 font-mono">→ Manifests as reality</span>
                </div>
              </Card>
            </div>

            <Card className="bg-slate-900/50 border-purple-500/30 p-6" data-testid="card-why-coherence">
              <h3 className="text-xl font-bold text-purple-400 mb-4">Why This Matters</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                This is why atoms exist. Why light travels. Why <span className="text-amber-400 font-bold">you</span> exist.
              </p>
              <div className="bg-gradient-to-r from-purple-900/30 to-amber-900/30 rounded-lg p-6 text-center border border-purple-500/30">
                <div className="text-2xl text-amber-400 font-bold">
                  Coherent oscillation is the fabric of reality.
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Constitution Tab */}
          <TabsContent value="constitution" className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-900/10 to-indigo-900/10 border-blue-500/30 p-6" data-testid="card-constitution-intro">
              <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Constitutional Enforcement
              </h2>
              <p className="text-gray-300 leading-relaxed">
                If coherent oscillation is how reality maintains stability, then coherent governance is how civilization maintains stability.
                Three clauses serve as boundary conditions—like Casimir plates creating stable vacuum states.
              </p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-red-900/20 to-red-950/40 border-red-500/30 p-6" data-testid="card-clause-1">
                <div className="flex items-center gap-3 mb-4">
                  <Scale className="w-8 h-8 text-red-400" />
                  <h3 className="text-lg font-bold text-red-400">Clause 1</h3>
                </div>
                <div className="text-xl font-bold text-white mb-3">Non-Dominance</div>
                <p className="text-gray-300 text-sm">
                  No monopoly of authority. No single entity can control more than its fair share of governance weight.
                </p>
                <div className="mt-4 p-2 bg-red-900/30 rounded text-center">
                  <span className="text-red-300 text-xs font-mono">YOCTO protected</span>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/40 border-purple-500/30 p-6" data-testid="card-clause-2">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-8 h-8 text-purple-400" />
                  <h3 className="text-lg font-bold text-purple-400">Clause 2</h3>
                </div>
                <div className="text-xl font-bold text-white mb-3">Immutable Rights</div>
                <p className="text-gray-300 text-sm">
                  Protected at YOCTO level. Fundamental rights cannot be modified or removed by any governance action.
                </p>
                <div className="mt-4 p-2 bg-purple-900/30 rounded text-center">
                  <span className="text-purple-300 text-xs font-mono">YOCTO protected</span>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-green-900/20 to-green-950/40 border-green-500/30 p-6" data-testid="card-clause-3">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-8 h-8 text-green-400" />
                  <h3 className="text-lg font-bold text-green-400">Clause 3</h3>
                </div>
                <div className="text-xl font-bold text-white mb-3">Energy-Backed Validity</div>
                <p className="text-gray-300 text-sm">
                  Actions require energy escrow. No governance action is valid without corresponding energy commitment.
                </p>
                <div className="mt-4 p-2 bg-green-900/30 rounded text-center">
                  <span className="text-green-300 text-xs font-mono">YOCTO protected</span>
                </div>
              </Card>
            </div>

            {/* BHLS Floor */}
            <Card className="bg-gradient-to-br from-amber-900/20 to-amber-950/30 border-amber-500/30 p-6" data-testid="card-bhls">
              <div className="flex items-center gap-3 mb-4">
                <Coins className="w-8 h-8 text-amber-400" />
                <h3 className="text-xl font-bold text-amber-400">The BHLS Floor</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-300 mb-4">
                    Basic Human Living Standard — Minimum coherent energy per citizen.
                  </p>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-amber-400 text-sm mb-1">Monthly Minimum</div>
                    <div className="text-3xl font-bold text-white">1,150 NXT</div>
                    <div className="text-gray-400 text-sm mt-1">Per citizen, guaranteed</div>
                  </div>
                </div>
                <div>
                  <div className="bg-slate-800/50 rounded-lg p-4 h-full">
                    <div className="text-purple-400 text-sm mb-2">Physics Basis</div>
                    <div className="font-mono text-lg text-white mb-2">E_BHLS = h × f_BHLS</div>
                    <p className="text-gray-400 text-sm">
                      No citizen falls below subsistence oscillation. The floor is derived from 
                      fundamental physics, not arbitrary policy.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Evolution Tab */}
          <TabsContent value="evolution" className="space-y-6">
            <Card className="bg-slate-900/50 border-cyan-500/30 p-6" data-testid="card-evolution-timeline">
              <h2 className="text-2xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Nexus Evolution Timeline
              </h2>

              {/* Historical Timeline */}
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Historical Foundation</h3>
                {[
                  { year: "1900", event: "Planck discovers E = hf", color: "cyan" },
                  { year: "1905", event: "Einstein discovers E = mc²", color: "orange" },
                  { year: "1948", event: "Casimir demonstrates vacuum energy", color: "purple" },
                  { year: "2008", event: "Bitcoin proves decentralized consensus possible", color: "amber" },
                  { year: "2023", event: "Quantum energy teleportation demonstrated", color: "green" },
                  { year: "2025", event: "Lambda Boson unifies frequency and mass", color: "pink" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4" data-testid={`timeline-entry-${item.year}`}>
                    <div className={`w-20 font-mono text-sm text-${item.color}-400`} data-testid={`timeline-year-${item.year}`}>{item.year}</div>
                    <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
                    <div className="text-gray-300" data-testid={`timeline-event-${item.year}`}>{item.event}</div>
                  </div>
                ))}
              </div>

              {/* Version Evolution */}
              <h3 className="text-lg font-semibold text-gray-300 mb-4">NexusOS Versions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { v: "v1-v4", name: "Genesis", desc: "Initial protocol concepts", status: "archived" },
                  { v: "v5", name: "Foundation", desc: "WNSP specification", status: "archived" },
                  { v: "v6", name: "Scientific", desc: "Theoretical foundation", status: "archived" },
                  { v: "v7", name: "Technical", desc: "Protocol stack", status: "archived" },
                  { v: "v8", name: "Professional", desc: "Economics & governance", status: "archived" },
                  { v: "v9", name: "Academic", desc: "Educational curriculum", status: "archived" },
                ].map((version, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${
                    version.status === 'current' 
                      ? 'bg-green-900/30 border-green-500' 
                      : 'bg-gray-800/30 border-gray-700'
                  }`} data-testid={`version-card-${version.v.replace(/[^a-zA-Z0-9]/g, '')}`}>
                    <div className="font-mono font-bold text-gray-400" data-testid={`version-number-${i}`}>{version.v}</div>
                    <div className="text-white font-semibold" data-testid={`version-name-${i}`}>{version.name}</div>
                    <div className="text-xs text-gray-500 mt-1" data-testid={`version-desc-${i}`}>{version.desc}</div>
                  </div>
                ))}
              </div>

              {/* v10 Highlight */}
              <div className="mt-6 p-6 bg-gradient-to-r from-amber-900/30 to-purple-900/30 rounded-xl border-2 border-amber-500/50" data-testid="version-highlight-v10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="font-mono font-bold text-3xl text-amber-400" data-testid="text-v10-version">v10</div>
                  <div>
                    <div className="text-2xl font-bold text-white" data-testid="text-v10-name">COHERENCE</div>
                    <div className="text-amber-300" data-testid="text-v10-desc">Complete Civilization Architecture</div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-auto" data-testid="badge-v10-current">
                    CURRENT
                  </Badge>
                </div>
              </div>
            </Card>

            {/* What v10 Achieves */}
            <Card className="bg-gradient-to-br from-green-900/10 to-cyan-900/10 border-green-500/30 p-6" data-testid="card-v10-achievements">
              <h3 className="text-xl font-bold text-green-400 mb-4">What v10.0 Achieves</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: <Atom className="w-5 h-5" />, title: "Theoretical Foundation", desc: "Lambda Boson physics (Λ = hf/c²)", id: "theoretical" },
                  { icon: <Orbit className="w-5 h-5" />, title: "Cosmological Origin", desc: "Oscillatory Cosmogenesis", id: "cosmology" },
                  { icon: <Waves className="w-5 h-5" />, title: "Technical Specification", desc: "WNSP protocol stack", id: "technical" },
                  { icon: <Coins className="w-5 h-5" />, title: "Economic Framework", desc: "BHLS floor + Economic Loop", id: "economic" },
                  { icon: <Shield className="w-5 h-5" />, title: "Governance Architecture", desc: "Constitutional enforcement", id: "governance" },
                  { icon: <BookOpen className="w-5 h-5" />, title: "Educational Pathway", desc: "Four-level curriculum", id: "educational" },
                  { icon: <Users className="w-5 h-5" />, title: "Community Infrastructure", desc: "Open source, GPL v3.0", id: "community" }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-4 border border-green-500/20" data-testid={`achievement-${item.id}`}>
                    <div className="text-green-400 mt-0.5">{item.icon}</div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2" data-testid={`achievement-title-${item.id}`}>
                        <span className="text-green-400">✓</span>
                        {item.title}
                      </div>
                      <div className="text-sm text-gray-400" data-testid={`achievement-desc-${item.id}`}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Resources */}
            <Card className="bg-slate-900/50 border-blue-500/30 p-6" data-testid="card-resources">
              <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Lambda Boson Theoretical Foundation", id: "theory" },
                  { name: "Oscillatory Cosmogenesis", id: "cosmogenesis" },
                  { name: "WNSP Protocol Stack", id: "protocol" },
                  { name: "Lambda Economics & Governance", id: "economics" },
                  { name: "Lambda Curriculum Guide", id: "curriculum" },
                  { name: "Complete Paper Collection", id: "papers" }
                ].map((resource, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer" data-testid={`resource-${resource.id}`}>
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300" data-testid={`resource-name-${resource.id}`}>{resource.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Research Modules */}
            <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/30 p-6" data-testid="card-research-modules">
              <h3 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                <FlaskConical className="w-5 h-5" />
                Research Modules
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Explore advanced applications of Lambda Boson theory across different domains.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/resonance-propulsion">
                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-orange-500/20 hover:border-orange-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group" data-testid="link-resonance-propulsion">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Rocket className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white group-hover:text-orange-300 transition-colors">Resonance Propulsion</h4>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">RESEARCH</Badge>
                      </div>
                      <p className="text-gray-400 text-sm">Lambda Boson propulsion theory with frustum cavity analysis</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-orange-400 transition-colors" />
                  </div>
                </Link>
                <Link href="/v7">
                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group" data-testid="link-wnsp-v7">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Waves className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">WNSP v7.0</h4>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">ACTIVE</Badge>
                      </div>
                      <p className="text-gray-400 text-sm">Wavelength Network Signaling Protocol implementation</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </Link>
                <Link href="/encoding-lab">
                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-purple-500/20 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group" data-testid="link-encoding-lab">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Atom className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors">Encoding Lab</h4>
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">TOOL</Badge>
                      </div>
                      <p className="text-gray-400 text-sm">W-ASCII wavelength encoding experimentation</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                </Link>
                <Link href="/announcements">
                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-green-500/20 hover:border-green-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group" data-testid="link-announcements">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white group-hover:text-green-300 transition-colors">Announcements</h4>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">NEWS</Badge>
                      </div>
                      <p className="text-gray-400 text-sm">Latest updates and substrate releases</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors" />
                  </div>
                </Link>
                <Link href="/workspace/wavefield">
                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-pink-500/20 hover:border-pink-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group" data-testid="link-wavefield">
                    <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white group-hover:text-pink-300 transition-colors">Wavefield Simulation</h4>
                        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-xs">NEW</Badge>
                      </div>
                      <p className="text-gray-400 text-sm">Φ_λ(r,t) eigenstate superposition simulator</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-pink-400 transition-colors" />
                  </div>
                </Link>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Message */}
        <Card className="mt-8 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/30 p-8 text-center" data-testid="card-footer">
          <h2 className="text-2xl font-bold text-indigo-400 mb-4">To Our Community</h2>
          <p className="text-gray-300 max-w-3xl mx-auto mb-6">
            You are not just using software. You are participating in an experiment:
            <span className="block text-amber-400 font-semibold mt-2">
              Can civilization be built on physical truth?
            </span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto text-sm">
            <div className="text-cyan-300">Planck showed us energy is real.</div>
            <div className="text-orange-300">Einstein showed us mass is energy.</div>
            <div className="text-green-300">Lambda shows us oscillation is mass.</div>
          </div>
          <p className="text-gray-400 mb-6">
            NexusOS shows us that governance, economics, and human cooperation can be grounded 
            in the same physics that governs stars, atoms, and light.
          </p>
          <div className="text-2xl font-bold">
            <span className="text-amber-400">Welcome to v10.0.</span>
            <span className="text-purple-400 ml-4">Welcome to coherence.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
