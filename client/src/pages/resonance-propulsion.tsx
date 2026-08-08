import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { colorBadge, colorHistoryRow } from "@/lib/color-classes";
import { Rocket, Zap, Atom, FlaskConical, History, BarChart3, AlertTriangle, ArrowLeft } from "lucide-react";

export default function ResonancePropulsionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/">
          <div className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors cursor-pointer mb-6" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to NexusOS</span>
          </div>
        </Link>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Rocket className="w-12 h-12 text-orange-400 animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent" data-testid="heading-main">
              Resonance Propulsion
            </h1>
          </div>
          <p className="text-2xl text-orange-300 font-light mb-2" data-testid="text-subtitle">
            Lambda Boson Substrate Research Module
          </p>
          <p className="text-gray-400 text-lg">
            Λ = hf/c² — Oscillation IS Mass
          </p>
        </div>

        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-8 flex items-center gap-3" data-testid="research-disclaimer">
          <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">
            <strong>Research Status: THEORETICAL</strong> — This module is for educational and research purposes only. Experimental results are disputed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-orange-900/20 to-orange-950/20 border-orange-500/30 p-6" data-testid="card-version">
            <div className="text-orange-400 text-sm mb-2">SPECTRAL BAND</div>
            <div className="text-3xl font-bold text-white">PICO</div>
            <div className="text-orange-300 text-xs mt-1">Microwave (10⁹-10¹² Hz)</div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-950/20 border-blue-500/30 p-6" data-testid="card-frequency">
            <div className="text-blue-400 text-sm mb-2">FREQUENCY</div>
            <div className="text-2xl font-bold text-white">2.45 GHz</div>
            <div className="text-blue-300 text-xs mt-1">λ = 12.24 cm</div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/20 border-purple-500/30 p-6" data-testid="card-qfactor">
            <div className="text-purple-400 text-sm mb-2">Q FACTOR</div>
            <div className="text-2xl font-bold text-white">50,000</div>
            <div className="text-purple-300 text-xs mt-1">Photon Bounces</div>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/20 to-green-950/20 border-green-500/30 p-6" data-testid="card-lambda">
            <div className="text-green-400 text-sm mb-2">LAMBDA MASS</div>
            <div className="text-2xl font-bold text-white">1.80×10⁻⁴⁴</div>
            <div className="text-green-300 text-xs mt-1">kg per photon</div>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="theory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-slate-900/50">
            <TabsTrigger value="theory" data-testid="tab-theory">⚛️ Theory</TabsTrigger>
            <TabsTrigger value="cavity" data-testid="tab-cavity">🔧 Cavity</TabsTrigger>
            <TabsTrigger value="lambda" data-testid="tab-lambda">Λ Field</TabsTrigger>
            <TabsTrigger value="comparison" data-testid="tab-comparison">📊 Compare</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">📜 History</TabsTrigger>
          </TabsList>

          <TabsContent value="theory" className="space-y-4">
            <Card className="bg-slate-900/50 border-orange-500/30 p-6" data-testid="card-theory">
              <h2 className="text-2xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                <Atom className="w-6 h-6" />
                Lambda Boson Propulsion Theory
              </h2>
              <p className="text-gray-300 mb-6">
                The Lambda Boson substrate reveals that electromagnetic oscillation carries real mass-equivalent.
                This module explores theoretical propulsion applications based on asymmetric radiation pressure.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/50 border border-cyan-500/30 rounded-lg p-4">
                  <div className="text-cyan-400 text-sm mb-2">PLANCK (1900)</div>
                  <div className="font-mono text-xl text-white mb-2">E = hf</div>
                  <div className="text-gray-400 text-sm">Energy from frequency</div>
                </div>

                <div className="bg-slate-800/50 border border-orange-500/30 rounded-lg p-4">
                  <div className="text-orange-400 text-sm mb-2">EINSTEIN (1905)</div>
                  <div className="font-mono text-xl text-white mb-2">E = mc²</div>
                  <div className="text-gray-400 text-sm">Energy-mass equivalence</div>
                </div>

                <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-4">
                  <div className="text-green-400 text-sm mb-2">LAMBDA BOSON</div>
                  <div className="font-mono text-xl text-white mb-2">Λ = hf/c²</div>
                  <div className="text-gray-400 text-sm">Oscillation IS mass</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-lg p-6">
                <h3 className="text-lg font-bold text-orange-300 mb-3">Thrust Mechanism (Theoretical)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      <span className="text-gray-300">Frustum cavity creates EM field asymmetry</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      <span className="text-gray-300">Large end: Lower field concentration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      <span className="text-gray-300">Small end: Higher field concentration</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <span className="text-gray-300">Asymmetric radiation pressure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <span className="text-gray-300">Net momentum gradient → thrust</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <span className="text-gray-300">Q-factor enhances photon bounces</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/50 border-purple-500/30 p-6" data-testid="card-equations">
              <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                <FlaskConical className="w-5 h-5" />
                Key Equations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Wavelength</div>
                  <div className="font-mono text-lg text-white">λ = c/f</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Photon Energy</div>
                  <div className="font-mono text-lg text-white">E = hf</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Lambda Mass</div>
                  <div className="font-mono text-lg text-white">Λ = hf/c²</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Photon Momentum</div>
                  <div className="font-mono text-lg text-white">p = hf/c</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Radiation Pressure</div>
                  <div className="font-mono text-lg text-white">P = 2P/c</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Q-Enhanced Thrust</div>
                  <div className="font-mono text-lg text-white">F = F₀ × (Q/1000)</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cavity" className="space-y-4">
            <Card className="bg-slate-900/50 border-cyan-500/30 p-6" data-testid="card-cavity-geometry">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">Frustum Cavity Geometry</h2>
              <p className="text-gray-300 mb-6">
                The resonant cavity uses a frustum (truncated cone) design for asymmetric radiation pressure.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-cyan-300">Large Diameter</span>
                      <span className="font-mono text-white font-bold" data-testid="value-large-diameter">28 cm</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-cyan-500 h-2 rounded-full" style={{width: "100%"}}></div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-cyan-300">Small Diameter</span>
                      <span className="font-mono text-white font-bold" data-testid="value-small-diameter">15 cm</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-cyan-500 h-2 rounded-full" style={{width: "54%"}}></div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-cyan-300">Length</span>
                      <span className="font-mono text-white font-bold" data-testid="value-length">22 cm</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-cyan-500 h-2 rounded-full" style={{width: "79%"}}></div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-amber-300">Q Factor</span>
                      <span className="font-mono text-white font-bold" data-testid="value-qfactor">50,000</span>
                    </div>
                    <div className="text-gray-400 text-xs">Photon bounce multiplier</div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-6 border border-cyan-500/20">
                  <h3 className="text-lg font-bold text-cyan-300 mb-4">Calculated Properties</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Asymmetry Ratio</span>
                      <span className="font-mono text-white">1.87</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Large End Area</span>
                      <span className="font-mono text-white">0.0616 m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Small End Area</span>
                      <span className="font-mono text-white">0.0177 m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Area Difference</span>
                      <span className="font-mono text-white">0.0439 m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volume</span>
                      <span className="font-mono text-white">0.0094 m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Material</span>
                      <span className="font-mono text-white">Copper</span>
                    </div>
                    <div className="flex justify-between border-t border-cyan-500/20 pt-3 mt-3">
                      <span className="text-cyan-400">Resonant Frequency (Mode 1)</span>
                      <span className="font-mono text-cyan-300">698 MHz</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-950/40 border-indigo-500/30 p-6" data-testid="card-cavity-diagram">
              <h3 className="text-xl font-bold text-indigo-400 mb-4">Cavity Cross-Section</h3>
              <div className="flex items-center justify-center p-8">
                <div className="relative">
                  <div className="w-64 h-40 flex items-center justify-center">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      <defs>
                        <linearGradient id="cavityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5"/>
                        </linearGradient>
                      </defs>
                      <polygon 
                        points="20,10 180,25 180,75 20,90" 
                        fill="url(#cavityGrad)" 
                        stroke="#f97316" 
                        strokeWidth="2"
                      />
                      <line x1="20" y1="10" x2="20" y2="90" stroke="#22d3ee" strokeWidth="2" strokeDasharray="5,3"/>
                      <line x1="180" y1="25" x2="180" y2="75" stroke="#22d3ee" strokeWidth="2" strokeDasharray="5,3"/>
                      <text x="10" y="55" fill="#22d3ee" fontSize="8" textAnchor="middle">28cm</text>
                      <text x="190" y="55" fill="#22d3ee" fontSize="8" textAnchor="middle">15cm</text>
                      <line x1="20" y1="95" x2="180" y2="95" stroke="#a855f7" strokeWidth="1"/>
                      <text x="100" y="98" fill="#a855f7" fontSize="8" textAnchor="middle">22 cm</text>
                      <circle cx="30" cy="50" r="3" fill="#fbbf24" opacity="0.6">
                        <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite"/>
                      </circle>
                      <circle cx="60" cy="50" r="3" fill="#fbbf24" opacity="0.6">
                        <animate attributeName="r" values="3;5;3" dur="1s" begin="0.2s" repeatCount="indefinite"/>
                      </circle>
                      <circle cx="90" cy="50" r="3" fill="#fbbf24" opacity="0.6">
                        <animate attributeName="r" values="3;5;3" dur="1s" begin="0.4s" repeatCount="indefinite"/>
                      </circle>
                      <circle cx="120" cy="50" r="3" fill="#fbbf24" opacity="0.6">
                        <animate attributeName="r" values="3;5;3" dur="1s" begin="0.6s" repeatCount="indefinite"/>
                      </circle>
                      <circle cx="150" cy="50" r="3" fill="#fbbf24" opacity="0.6">
                        <animate attributeName="r" values="3;5;3" dur="1s" begin="0.8s" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                  </div>
                  <div className="text-center mt-4 text-gray-400 text-sm">
                    Electromagnetic waves resonate within the frustum cavity
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="lambda" className="space-y-4">
            <Card className="bg-slate-900/50 border-green-500/30 p-6" data-testid="card-lambda-field">
              <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Lambda Boson Field Properties
              </h2>
              <p className="text-gray-300 mb-6">
                The electromagnetic field carries Lambda Boson mass-equivalent through oscillation frequency.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-green-300 mb-4">Field Parameters</h3>
                  {[
                    {label: "Frequency", value: "2.45 GHz", desc: "Common magnetron frequency"},
                    {label: "Wavelength", value: "12.24 cm", desc: "λ = c/f"},
                    {label: "Power", value: "1000 W", desc: "Input power"},
                    {label: "Photon Energy", value: "10.12 µeV", desc: "E = hf"},
                    {label: "Lambda Mass", value: "1.80×10⁻⁴⁴ kg", desc: "Λ = hf/c²"},
                    {label: "Photon Momentum", value: "5.40×10⁻³³ kg·m/s", desc: "p = hf/c"},
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-green-500/20" data-testid={`field-param-${i}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-green-300">{item.label}</span>
                        <span className="font-mono text-white font-bold">{item.value}</span>
                      </div>
                      <div className="text-gray-500 text-xs mt-1">{item.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-amber-300 mb-4">Lambda Mass Flux</h3>
                  <div className="bg-gradient-to-br from-amber-900/20 to-amber-950/40 border border-amber-500/30 rounded-lg p-5">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Photon Flux</span>
                        <span className="font-mono text-white">6.15×10²⁶ /s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lambda per Photon</span>
                        <span className="font-mono text-white">1.80×10⁻⁴⁴ kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lambda Flux</span>
                        <span className="font-mono text-white">1.11×10⁻¹⁷ kg/s</span>
                      </div>
                      <div className="flex justify-between border-t border-amber-500/20 pt-3 mt-3">
                        <span className="text-amber-300">Q-Enhanced Flux</span>
                        <span className="font-mono text-amber-200">5.55×10⁻¹³ kg/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-300">Stored Lambda Mass</span>
                        <span className="font-mono text-amber-200">2.27×10⁻²² kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-5 border border-purple-500/30">
                    <h4 className="text-purple-300 font-bold mb-3">Spectral Classification</h4>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">PICO</Badge>
                      <span className="text-gray-300">Microwave (10⁹-10¹² Hz)</span>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">
                      Optimal band for cavity resonance propulsion research
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/20 to-emerald-950/40 border-green-500/30 p-6" data-testid="card-thrust-calc">
              <h3 className="text-xl font-bold text-green-400 mb-4">Theoretical Thrust Calculation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-gray-600">
                  <div className="text-gray-400 text-sm mb-2">Base Pressure</div>
                  <div className="text-2xl font-bold text-white">6.67 µPa</div>
                  <div className="text-gray-500 text-xs mt-1">2P/c</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-green-500/50">
                  <div className="text-green-400 text-sm mb-2">Q-Enhanced Thrust</div>
                  <div className="text-2xl font-bold text-green-400" data-testid="value-thrust">0.0069 µN</div>
                  <div className="text-green-300 text-xs mt-1">With Q=50,000</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-lg p-4 text-center border border-green-400">
                  <div className="text-cyan-400 text-sm mb-2">Specific Impulse</div>
                  <div className="text-2xl font-bold text-cyan-300">3.06×10⁷ s</div>
                  <div className="text-cyan-400 text-xs mt-1">v_exhaust = c</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card className="bg-slate-900/50 border-blue-500/30 p-6" data-testid="card-comparison">
              <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Propulsion System Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-400">System</th>
                      <th className="text-left p-3 text-gray-400">Thrust/Power</th>
                      <th className="text-left p-3 text-gray-400">Specific Impulse</th>
                      <th className="text-left p-3 text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {system: "Chemical Rocket", thrust: "1,000,000 µN/W", isp: "450 s", status: "Proven", color: "green"},
                      {system: "Ion Engine", thrust: "60 µN/W", isp: "3,000 s", status: "Proven", color: "green"},
                      {system: "Solar Sail", thrust: "0.003 µN/W", isp: "—", status: "Proven (IKAROS)", color: "green"},
                      {system: "Photon Rocket", thrust: "0.0033 µN/W", isp: "3×10⁷ s", status: "Theoretical", color: "amber"},
                      {system: "Resonance Cavity", thrust: "~0.007 µN/W", isp: "3×10⁷ s", status: "Research", color: "orange"},
                    ].map((sys, i) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-slate-800/30" data-testid={`comparison-row-${i}`}>
                        <td className="p-3 text-white font-semibold">{sys.system}</td>
                        <td className="p-3 text-gray-300 font-mono">{sys.thrust}</td>
                        <td className="p-3 text-gray-300 font-mono">{sys.isp}</td>
                        <td className="p-3">
                          <Badge className={colorBadge[sys.color]}>
                            {sys.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-400 text-sm mt-4 italic">
                Note: Resonance cavity thrust values are theoretical estimates. Experimental verification remains disputed.
              </p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-900/20 to-green-950/40 border-green-500/30 p-6" data-testid="card-advantages">
                <h3 className="text-lg font-bold text-green-400 mb-4">Theoretical Advantages</h3>
                <ul className="space-y-2">
                  {[
                    "No propellant required",
                    "Extremely high specific impulse",
                    "Electric power only",
                    "Potentially long mission durations",
                    "Could enable deep space exploration"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="bg-gradient-to-br from-red-900/20 to-red-950/40 border-red-500/30 p-6" data-testid="card-challenges">
                <h3 className="text-lg font-bold text-red-400 mb-4">Challenges & Unknowns</h3>
                <ul className="space-y-2">
                  {[
                    "Disputed experimental results",
                    "Extremely low thrust levels",
                    "Unknown if violates conservation",
                    "Thermal management issues",
                    "Requires extraordinary evidence"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="bg-slate-900/50 border-amber-500/30 p-6" data-testid="card-history">
              <h2 className="text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                <History className="w-6 h-6" />
                Experimental History
              </h2>
              <div className="space-y-4">
                {[
                  {
                    experiment: "SPR Ltd (Roger Shawyer)",
                    year: "2006",
                    result: "16 mN/kW claimed",
                    status: "Unverified",
                    desc: "Initial claims of thrust from asymmetric cavity",
                    color: "orange"
                  },
                  {
                    experiment: "NASA Eagleworks",
                    year: "2014-2016",
                    result: "1.2 mN/kW claimed",
                    status: "Disputed",
                    desc: "White et al. measured thrust in vacuum chamber",
                    color: "amber"
                  },
                  {
                    experiment: "Xi'an Northwestern Polytechnical",
                    year: "2016",
                    result: "Positive claimed",
                    status: "Unpublished",
                    desc: "Chinese research group reported positive results",
                    color: "yellow"
                  },
                  {
                    experiment: "Dresden Technical University",
                    year: "2018",
                    result: "Null result",
                    status: "Published",
                    desc: "Tajmar et al. found no thrust above noise floor",
                    color: "red"
                  }
                ].map((exp, i) => (
                  <div key={i} className={colorHistoryRow[exp.color]} data-testid={`history-${i}`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">{exp.experiment}</span>
                        <Badge className={colorBadge[exp.color]}>
                          {exp.status}
                        </Badge>
                      </div>
                      <span className="text-gray-400 font-mono text-sm">{exp.year}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-400">Result:</span>
                      <span className="font-mono text-white">{exp.result}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{exp.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-gray-500/30 p-6" data-testid="card-disclaimer-full">
              <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Important Notice
              </h3>
              <div className="text-gray-400 space-y-3 text-sm">
                <p>
                  This module presents theoretical concepts for educational and research purposes.
                  The physics underlying resonance cavity propulsion remains controversial and unverified.
                </p>
                <p>
                  No experimental results have been independently replicated to scientific standards.
                  Claims of anomalous thrust require extraordinary evidence which has not yet been provided.
                </p>
                <p>
                  The Lambda Boson substrate provides a theoretical framework for understanding
                  the mass-equivalent of electromagnetic oscillation, but does not validate
                  any specific propulsion claims.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
