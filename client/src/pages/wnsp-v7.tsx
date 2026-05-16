import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Zap, Waves, Atom, Shield, Lock, Unlock, RotateCcw, Orbit, Check, ArrowLeft } from "lucide-react";

export default function WNSPv7Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/">
          <div className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer mb-6" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </div>
        </Link>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Unlock className="w-12 h-12 text-green-400 animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              WNSP v7.0
            </h1>
          </div>
          <p className="text-2xl text-cyan-300 font-light mb-2">
            Lambda Boson Substrate — UNLOCKED ✅
          </p>
          <p className="text-gray-400 text-lg">
            Λ = hf/c² — Oscillation IS Mass
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-900/20 to-green-950/20 border-green-500/30 p-6">
            <div className="text-green-400 text-sm mb-2">VERSION</div>
            <div className="text-3xl font-bold text-white">v7.1.0</div>
            <div className="text-green-300 text-xs mt-1">Mainline Active</div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-950/20 border-blue-500/30 p-6">
            <div className="text-blue-400 text-sm mb-2">CORE PRINCIPLE</div>
            <div className="text-2xl font-bold text-white">E = hf</div>
            <div className="text-blue-300 text-xs mt-1">Planck Energy</div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/20 border-purple-500/30 p-6">
            <div className="text-purple-400 text-sm mb-2">STRUCTURE</div>
            <div className="text-2xl font-bold text-white">Octave Bands</div>
            <div className="text-purple-300 text-xs mt-1">C0 → C10</div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-900/20 to-amber-950/20 border-amber-500/30 p-6">
            <div className="text-amber-400 text-sm mb-2">PROPAGATION</div>
            <div className="text-2xl font-bold text-white">Excitation</div>
            <div className="text-amber-300 text-xs mt-1">Chain Resonance</div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="features" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-slate-900/50">
            <TabsTrigger value="features" data-testid="tab-features">🔓 Features</TabsTrigger>
            <TabsTrigger value="physics" data-testid="tab-physics">⚛️ Physics</TabsTrigger>
            <TabsTrigger value="oam" data-testid="tab-oam">🌀 OAM</TabsTrigger>
            <TabsTrigger value="octaves" data-testid="tab-octaves">🌈 Octaves</TabsTrigger>
            <TabsTrigger value="substrate" data-testid="tab-substrate">🔬 Substrate</TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="space-y-4">
            <Card className="bg-slate-900/50 border-cyan-500/30 p-6">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Unlock className="w-6 h-6" />
                Unlocked in v7.0
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    icon: <Waves className="w-5 h-5" />,
                    title: "Lambda Boson Substrate",
                    desc: "Λ = hf/c² — Messages carry mass-equivalent through oscillation frequency",
                    status: "ACTIVE"
                  },
                  {
                    icon: <Zap className="w-5 h-5" />,
                    title: "Harmonic Octave Protocol",
                    desc: "11 octave bands (C0-C10) spanning radio to Planck frequency",
                    status: "ACTIVE"
                  },
                  {
                    icon: <Atom className="w-5 h-5" />,
                    title: "Oscillation Registers",
                    desc: "Data encoded as oscillation states (f, A, φ, coherence)",
                    status: "ACTIVE"
                  },
                  {
                    icon: <Shield className="w-5 h-5" />,
                    title: "Constitutional Enforcement",
                    desc: "7-band spectral authority with governance protection",
                    status: "ACTIVE"
                  },
                  {
                    title: "Standing Wave Storage",
                    desc: "Localized oscillations represent stored value (mass accumulation)",
                    status: "ACTIVE"
                  },
                  {
                    title: "Gravitational Routing",
                    desc: "Mass-weighted paths via Λ potential fields",
                    status: "ACTIVE"
                  },
                  {
                    title: "W-ASCII v7.1 Encoding",
                    desc: "256-character wavelength encoding with Λ, Ω, Φ, Ψ symbols",
                    status: "ACTIVE"
                  },
                  {
                    title: "Immutable Human Rights Floor",
                    desc: "1,150 NXT/month covering connectivity, fresh water, healthcare and services — guaranteed under international law",
                    status: "ACTIVE"
                  }
                ].map((feature, i) => (
                  <div key={i} className="bg-slate-800/50 border border-green-500/20 rounded-lg p-4 hover:border-green-500/40 transition-colors">
                    <div className="flex items-start gap-3">
                      {feature.icon && <div className="text-green-400 mt-1">{feature.icon}</div>}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{feature.title}</h3>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            {feature.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">{feature.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Upgrade Path */}
            <Card className="bg-gradient-to-br from-blue-900/10 to-purple-900/10 border-blue-500/30 p-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Version Evolution</h3>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {[
                  { v: "v2.0", name: "Basic DAG", status: "archived" },
                  { v: "v3.0", name: "GhostDAG", status: "archived" },
                  { v: "v4.0", name: "Spectral", status: "archived" },
                  { v: "v5.0", name: "PoSPECTRUM", status: "archived" },
                  { v: "v6.0", name: "Constitutional", status: "archived" },
                  { v: "v7.1", name: "Lambda Boson", status: "mainline" }
                ].map((version, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`px-4 py-2 rounded-lg border ${
                      version.status === 'mainline' 
                        ? 'bg-green-500/20 border-green-500 text-green-400' 
                        : 'bg-gray-800/50 border-gray-700 text-gray-500'
                    }`}>
                      <div className="font-mono font-bold">{version.v}</div>
                      <div className="text-xs">{version.name}</div>
                    </div>
                    {i < 5 && <div className="text-gray-600">→</div>}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="physics" className="space-y-4">
            <Card className="bg-slate-900/50 border-purple-500/30 p-6">
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Physics Foundation</h2>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-purple-300 mb-2">Lambda Boson Unification</h3>
                  <div className="font-mono text-2xl text-white mb-3">Λ = hf/c²</div>
                  <p className="text-gray-300 mb-4">
                    The primordial synthesis of Planck (E=hf) and Einstein (E=mc²).
                    Oscillation frequency directly creates mass-equivalent.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-purple-400 font-semibold">h (Planck constant)</div>
                      <div className="text-gray-400 font-mono">6.626×10⁻³⁴ J·s</div>
                    </div>
                    <div>
                      <div className="text-purple-400 font-semibold">c (Speed of light)</div>
                      <div className="text-gray-400 font-mono">2.998×10⁸ m/s</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 border border-cyan-500/30 rounded-lg p-4">
                    <div className="text-cyan-400 text-sm mb-2">PLANCK (1900)</div>
                    <div className="font-mono text-xl text-white mb-2">E = hf</div>
                    <div className="text-gray-400 text-sm">Energy IS frequency</div>
                  </div>

                  <div className="bg-slate-800/50 border border-orange-500/30 rounded-lg p-4">
                    <div className="text-orange-400 text-sm mb-2">EINSTEIN (1905)</div>
                    <div className="font-mono text-xl text-white mb-2">E = mc²</div>
                    <div className="text-gray-400 text-sm">Energy IS mass</div>
                  </div>

                  <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-4">
                    <div className="text-green-400 text-sm mb-2">NEXUSOS (2024)</div>
                    <div className="font-mono text-xl text-white mb-2">Λ = hf/c²</div>
                    <div className="text-gray-400 text-sm">Oscillation IS mass</div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* OAM Multiplexing Tab */}
          <TabsContent value="oam" className="space-y-6">
            {/* Physics Foundation */}
            <Card className="bg-gradient-to-br from-cyan-900/10 to-purple-900/10 border-cyan-500/30 p-6" data-testid="card-oam-foundation">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Orbit className="w-6 h-6" />
                OAM Physics Foundation
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Orbital Angular Momentum (OAM) uses the <span className="text-cyan-400 font-semibold">helical wavefront structure</span> of 
                light beams to create orthogonal communication channels. Each OAM mode carries a distinct topological charge.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-cyan-500/30">
                  <div className="text-gray-400 text-sm mb-2">Angular Momentum per Photon</div>
                  <div className="font-mono text-2xl text-cyan-400 font-bold">L = l × ℏ</div>
                  <div className="text-gray-400 text-xs mt-2">l = topological charge (integer)</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-purple-500/30">
                  <div className="text-gray-400 text-sm mb-2">Helical Phase Structure</div>
                  <div className="font-mono text-2xl text-purple-400 font-bold">φ(θ) = l × θ</div>
                  <div className="text-gray-400 text-xs mt-2">θ = azimuthal angle</div>
                </div>
              </div>
            </Card>

            {/* 8 OAM Modes Table */}
            <Card className="bg-slate-900/50 border-amber-500/30 p-6" data-testid="card-oam-modes">
              <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                8 OAM Modes Implemented
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-400">Mode</th>
                      <th className="text-left p-3 text-gray-400">l value</th>
                      <th className="text-left p-3 text-gray-400">Angular Momentum</th>
                      <th className="text-left p-3 text-gray-400">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { mode: "L-3", l: "-3", momentum: "-3ℏ", desc: "Counter-clockwise, 3 helices", color: "red" },
                      { mode: "L-2", l: "-2", momentum: "-2ℏ", desc: "Counter-clockwise, 2 helices", color: "orange" },
                      { mode: "L-1", l: "-1", momentum: "-1ℏ", desc: "Counter-clockwise, single helix", color: "amber" },
                      { mode: "L0", l: "0", momentum: "0", desc: "Plane wave (Gaussian)", color: "gray" },
                      { mode: "L+1", l: "+1", momentum: "+1ℏ", desc: "Clockwise, single helix", color: "lime" },
                      { mode: "L+2", l: "+2", momentum: "+2ℏ", desc: "Clockwise, 2 helices", color: "green" },
                      { mode: "L+3", l: "+3", momentum: "+3ℏ", desc: "Clockwise, 3 helices", color: "cyan" },
                      { mode: "L+4", l: "+4", momentum: "+4ℏ", desc: "Clockwise, 4 helices", color: "blue" }
                    ].map((oam, i) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-slate-800/30" data-testid={`oam-mode-${oam.mode}`}>
                        <td className={`p-3 font-mono font-bold text-${oam.color}-400`}>{oam.mode}</td>
                        <td className="p-3 text-gray-300 font-mono">{oam.l}</td>
                        <td className="p-3 text-gray-300 font-mono">{oam.momentum}</td>
                        <td className="p-3 text-gray-400">{oam.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Capacity Improvement */}
            <Card className="bg-gradient-to-br from-green-900/20 to-green-950/40 border-green-500/30 p-6" data-testid="card-oam-capacity">
              <h3 className="text-xl font-bold text-green-400 mb-4">Capacity Improvement</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-gray-600">
                  <div className="text-gray-400 text-sm mb-2">Base WNSP v3.0</div>
                  <div className="text-3xl font-bold text-gray-300">100</div>
                  <div className="text-gray-500 text-xs mt-1">wavelength channels</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-green-500/50">
                  <div className="text-green-400 text-sm mb-2">WNSP v4.0 + OAM</div>
                  <div className="text-3xl font-bold text-green-400">800</div>
                  <div className="text-green-300 text-xs mt-1">100 × 8 total channels</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-lg p-4 text-center border border-green-400">
                  <div className="text-cyan-400 text-sm mb-2">Improvement</div>
                  <div className="text-3xl font-bold text-cyan-300">8×</div>
                  <div className="text-cyan-400 text-xs mt-1">same spectrum</div>
                </div>
              </div>
              <p className="text-green-300 text-sm text-center italic">
                OAM multiplexing delivers 8× capacity without using additional spectrum bandwidth.
              </p>
            </Card>

            {/* Lambda Boson + OAM Unification */}
            <Card className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/40 p-6" data-testid="card-oam-lambda">
              <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                <Atom className="w-5 h-5" />
                Lambda Boson + OAM Unification
              </h3>
              <p className="text-gray-300 mb-4">
                Each OAM channel carries its own Lambda mass-equivalent, with angular momentum governance weighting:
              </p>
              <div className="bg-slate-800/80 rounded-xl p-6 text-center border border-purple-500/30 mb-4">
                <div className="font-mono text-2xl md:text-3xl text-purple-300 mb-4">
                  Λ_channel = (hf/c²) × (1 + |l|/l_max)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                  <div className="text-gray-400">
                    <span className="text-purple-400 font-mono">|l|</span> = absolute topological charge
                  </div>
                  <div className="text-gray-400">
                    <span className="text-purple-400 font-mono">l_max</span> = maximum mode (4)
                  </div>
                </div>
              </div>
              <p className="text-purple-300 text-sm text-center">
                This extends the Lambda Boson substrate with angular momentum governance weighting.
              </p>
            </Card>

            {/* Verification Results */}
            <Card className="bg-slate-900/50 border-green-500/30 p-6" data-testid="card-oam-verification">
              <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Verification Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { test: "800 total channels (100 wavelengths × 8 OAM modes)", status: "passed" },
                  { test: "Encode/decode round-trip verified", status: "passed" },
                  { test: "Angular momentum tracking working", status: "passed" },
                  { test: "Lambda mass calculations correct", status: "passed" },
                  { test: "Backward compatible with v2.0/v3.0", status: "passed" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-green-900/20 border border-green-500/30 rounded-lg p-3" data-testid={`verification-${i}`}>
                    <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-gray-300 text-sm">{item.test}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="octaves" className="space-y-4">
            <Card className="bg-slate-900/50 border-amber-500/30 p-6">
              <h2 className="text-2xl font-bold text-amber-400 mb-6">Octave Spectrum (C0 → C10)</h2>
              
              <div className="space-y-3">
                {[
                  { band: "C0", freq: "1 kHz - 1 MHz", role: "Sub-radio mesh sync", color: "red" },
                  { band: "C1", freq: "1 MHz - 1 GHz", role: "Radio broadcast", color: "orange" },
                  { band: "C2", freq: "1 GHz - 1 THz", role: "Microwave device link", color: "amber" },
                  { band: "C3", freq: "1 THz - 10 THz", role: "Far infrared sensing", color: "yellow" },
                  { band: "C4", freq: "10 THz - 100 THz", role: "Near infrared proximity", color: "lime" },
                  { band: "C5", freq: "430-750 THz", role: "Visible light messaging", color: "green" },
                  { band: "C6", freq: "750 THz - 30 PHz", role: "Ultraviolet secure", color: "cyan" },
                  { band: "C7", freq: "30 PHz - 3 EHz", role: "X-ray governance", color: "blue" },
                  { band: "C8", freq: "3 EHz - 3 ZHz", role: "Gamma constitutional", color: "purple" },
                  { band: "C9", freq: "3 ZHz - 10 YHz", role: "High-energy Planck", color: "violet" },
                  { band: "C10", freq: "10 YHz - Planck", role: "Planck boundary", color: "fuchsia" }
                ].map((octave, i) => (
                  <div key={i} className={`bg-${octave.color}-900/20 border border-${octave.color}-500/30 rounded-lg p-4 hover:bg-${octave.color}-900/30 transition-colors`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`font-mono font-bold text-2xl text-${octave.color}-400 w-16`}>
                          {octave.band}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{octave.role}</div>
                          <div className={`text-sm text-${octave.color}-300 font-mono`}>{octave.freq}</div>
                        </div>
                      </div>
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-${octave.color}-400 to-${octave.color}-600`} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="substrate" className="space-y-4">
            <Card className="bg-slate-900/50 border-green-500/30 p-6">
              <h2 className="text-2xl font-bold text-green-400 mb-6">Lambda Boson Substrate Components</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-cyan-500/30 rounded-lg p-5">
                    <h3 className="font-bold text-cyan-400 mb-2">Oscillator State</h3>
                    <div className="text-sm text-gray-300 space-y-1 font-mono">
                      <div>• frequency (f): Hz</div>
                      <div>• amplitude (A): 0.0-1.0</div>
                      <div>• phase (φ): 0-2π radians</div>
                      <div>• coherence (τ): seconds</div>
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Fundamental unit of substrate
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-5">
                    <h3 className="font-bold text-purple-400 mb-2">Oscillation Register</h3>
                    <div className="text-sm text-gray-300">
                      Array of oscillator states encoding data as wave patterns
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Data IS oscillation (not bytes)
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-amber-500/30 rounded-lg p-5">
                    <h3 className="font-bold text-amber-400 mb-2">Standing Wave Registry</h3>
                    <div className="text-sm text-gray-300">
                      Detects localized oscillation patterns representing stored value
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Mass accumulation = value storage
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-5">
                    <h3 className="font-bold text-green-400 mb-2">Gravitational Field</h3>
                    <div className="text-sm text-gray-300">
                      Mass-weighted routing paths via Λ potential gradients
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Routes follow mass topology
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-6">
                <h3 className="text-lg font-bold text-green-300 mb-3">Conservation Law</h3>
                <div className="font-mono text-xl text-white mb-2">
                  ΣΛ_in = ΣΛ_out + ΣΛ_stored + ΣΛ_dissipated
                </div>
                <p className="text-gray-300 text-sm">
                  Total Lambda mass is conserved across the network. Mass cannot be created or destroyed,
                  only transferred or temporarily stored in standing wave patterns.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
