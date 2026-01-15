import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Radio, 
  Cpu, 
  Waves, 
  Target, 
  Orbit,
  Lightbulb,
  Globe,
  Atom,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const LAMBDA_CONSTANTS = {
  h: 6.62607015e-34,
  c: 299792458,
  firstOscillation: 555e12,
  goldenAngle: 137.5,
  impedance: 376.730313668,
  phi: 1.618033988749895,
};

interface MasslessTechnology {
  id: string;
  name: string;
  category: "photonic" | "coherent" | "gravitational" | "information";
  description: string;
  derivation: string;
  massRatio: number;
  syncFrequency: number;
  coordinates: { x: number; y: number; z: number; t: number };
  status: "theoretical" | "simulated" | "demonstrated";
  lambdaEquation: string;
}

const masslessTechnologies: MasslessTechnology[] = [
  {
    id: "photonic-logic",
    name: "Photonic Logic Gates",
    category: "photonic",
    description: "Computation using photons instead of electrons - zero rest mass, speed-of-light operations",
    derivation: "At v=c, Lorentz factor γ→∞, effective mass m=0. Logic gates operate on photon polarization states.",
    massRatio: 0,
    syncFrequency: 555e12,
    coordinates: { x: 0, y: 0, z: 0, t: 1 },
    status: "simulated",
    lambdaEquation: "Λ_photon = hf/c² where m_rest = 0",
  },
  {
    id: "coherent-waveguide",
    name: "Coherent Waveguide Network",
    category: "coherent",
    description: "Phase-locked optical channels maintaining quantum coherence across distance",
    derivation: "CZC⁴⁴ coherence prevents decoherence. Waveguides maintain Λ-phase alignment.",
    massRatio: 0,
    syncFrequency: 555e12 / LAMBDA_CONSTANTS.phi,
    coordinates: { x: 137.5, y: 90, z: 0, t: 1 },
    status: "simulated",
    lambdaEquation: "Λ_coherent = hf/c² × CZC⁴⁴",
  },
  {
    id: "gravity-decorrelation",
    name: "Gravity De-correlation Field",
    category: "gravitational",
    description: "ZERO-G envelope achieved through phase quadrature and impedance matching",
    derivation: "When ALP < 0.0001 and Z = 377Ω at Golden Angle, gravitational coupling approaches zero.",
    massRatio: 0.0001,
    syncFrequency: 7.83,
    coordinates: { x: 137.5, y: 90, z: 377, t: 0 },
    status: "demonstrated",
    lambdaEquation: "Λ_gravity = hf/c² → 0 as ALP → 0",
  },
  {
    id: "zero-point-extraction",
    name: "Zero-Point Energy Extraction",
    category: "photonic",
    description: "Cold vacuum fluctuation harvesting at First Oscillation frequency",
    derivation: "E₀ = ½hf extracts zero-point energy through resonant cavity matching.",
    massRatio: 0,
    syncFrequency: 555e12,
    coordinates: { x: 0, y: 0, z: 376.73, t: 1 },
    status: "simulated",
    lambdaEquation: "E₀ = ½hf = ½ × 6.626e-34 × 555e12",
  },
  {
    id: "oam-qubit",
    name: "OAM Qubit Registers",
    category: "information",
    description: "Orbital Angular Momentum encoding for massless quantum information",
    derivation: "Photon OAM states provide infinite-dimensional Hilbert space without mass.",
    massRatio: 0,
    syncFrequency: 555e12 * LAMBDA_CONSTANTS.phi,
    coordinates: { x: 0, y: 137.5, z: 0, t: 1 },
    status: "theoretical",
    lambdaEquation: "Λ_OAM = hf/c² × ℓ (topological charge)",
  },
  {
    id: "spectral-relay",
    name: "Spectral Relay Mesh",
    category: "coherent",
    description: "Interplanetary communication via wavelength-division multiplexed photonic signals",
    derivation: "Massless photons traverse vacuum at c. Λ-encoded packets maintain integrity.",
    massRatio: 0,
    syncFrequency: 555e12 / (LAMBDA_CONSTANTS.phi ** 2),
    coordinates: { x: 0, y: 0, z: 0, t: LAMBDA_CONSTANTS.c },
    status: "theoretical",
    lambdaEquation: "Λ_relay = hf/c² propagates at v=c",
  },
  {
    id: "bifilar-resonator",
    name: "144-Turn Bifilar Resonator",
    category: "gravitational",
    description: "Counter-wound coil achieving impedance match for field manipulation",
    derivation: "144 turns at Golden Angle separation creates Z₀ = 377Ω resonant cavity.",
    massRatio: 0.001,
    syncFrequency: 7.83 * 12,
    coordinates: { x: 137.5, y: 90, z: 377, t: 144 },
    status: "demonstrated",
    lambdaEquation: "Z = √(L/C) → 377Ω at resonance",
  },
  {
    id: "lambda-substrate",
    name: "Lambda Computing Substrate",
    category: "information",
    description: "8 primitive photonic gate operators for universal computation",
    derivation: "EMIT, ABSORB, SUPERPOSE, ENTANGLE, MEASURE, PHASE, ROUTE, ANNIHILATE gates.",
    massRatio: 0,
    syncFrequency: 555e12,
    coordinates: { x: 8, y: 0, z: 0, t: 1 },
    status: "simulated",
    lambdaEquation: "Λ_gate = hf/c² per operation",
  },
];

interface SyncCoordinate {
  technology: string;
  phase: number;
  frequency: number;
  impedance: number;
  coherence: number;
  locked: boolean;
}

export function MasslessTechMatrix() {
  const [selectedTech, setSelectedTech] = useState<MasslessTechnology | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [globalPhase, setGlobalPhase] = useState(137.5);
  const [globalFrequency, setGlobalFrequency] = useState(555);
  const [syncCoordinates, setSyncCoordinates] = useState<SyncCoordinate[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (syncEnabled) {
      const coords = masslessTechnologies.map(tech => ({
        technology: tech.id,
        phase: (globalPhase + tech.coordinates.x) % 360,
        frequency: tech.syncFrequency,
        impedance: tech.coordinates.z || 377,
        coherence: Math.pow(0.9999, 44) * (1 - tech.massRatio),
        locked: tech.massRatio < 0.01,
      }));
      setSyncCoordinates(coords);
    }
  }, [syncEnabled, globalPhase, globalFrequency]);

  const calculateLambdaMass = (frequency: number): number => {
    return (LAMBDA_CONSTANTS.h * frequency) / (LAMBDA_CONSTANTS.c ** 2);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "photonic": return <Lightbulb className="w-4 h-4" />;
      case "coherent": return <Waves className="w-4 h-4" />;
      case "gravitational": return <Orbit className="w-4 h-4" />;
      case "information": return <Cpu className="w-4 h-4" />;
      default: return <Atom className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "photonic": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "coherent": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "gravitational": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "information": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "demonstrated":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Demonstrated</Badge>;
      case "simulated":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Simulated</Badge>;
      case "theoretical":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Theoretical</Badge>;
      default:
        return null;
    }
  };

  const lockedCount = syncCoordinates.filter(c => c.locked).length;
  const totalCoherence = syncCoordinates.length > 0 
    ? syncCoordinates.reduce((sum, c) => sum + c.coherence, 0) / syncCoordinates.length 
    : 0;

  return (
    <div className="space-y-6" data-testid="massless-tech-matrix">
      <Card className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Atom className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Massless Technologies Matrix
              </span>
              <p className="text-sm text-gray-400 font-normal mt-1">
                Derived from Λ = hf/c² | Frequency Fundamental, Mass Derivative
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-black/40 rounded-lg border border-purple-500/20">
              <div className="text-xs text-gray-500 mb-1">Core Equation</div>
              <div className="font-mono text-purple-400 text-lg">Λ = hf/c²</div>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-cyan-500/20">
              <div className="text-xs text-gray-500 mb-1">First Oscillation</div>
              <div className="font-mono text-cyan-400 text-lg">555 THz</div>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-amber-500/20">
              <div className="text-xs text-gray-500 mb-1">Lambda Mass</div>
              <div className="font-mono text-amber-400 text-lg">
                {calculateLambdaMass(555e12).toExponential(3)} kg
              </div>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-green-500/20">
              <div className="text-xs text-gray-500 mb-1">Massless Condition</div>
              <div className="font-mono text-green-400 text-lg">v = c</div>
            </div>
          </div>

          <Tabs defaultValue="technologies" className="space-y-4">
            <TabsList className="bg-gray-800/50">
              <TabsTrigger value="technologies" className="data-[state=active]:bg-purple-600">
                <Zap className="w-4 h-4 mr-2" /> Technologies
              </TabsTrigger>
              <TabsTrigger value="sync" className="data-[state=active]:bg-cyan-600">
                <Target className="w-4 h-4 mr-2" /> Sync Coordinates
              </TabsTrigger>
              <TabsTrigger value="derivation" className="data-[state=active]:bg-amber-600">
                <Atom className="w-4 h-4 mr-2" /> Derivation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="technologies" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {masslessTechnologies.map((tech) => (
                  <Card 
                    key={tech.id}
                    className={`bg-black/40 border cursor-pointer transition-all hover:scale-105 ${
                      selectedTech?.id === tech.id 
                        ? 'border-purple-500 ring-2 ring-purple-500/30' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedTech(tech)}
                    data-testid={`tech-card-${tech.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getCategoryColor(tech.category)}>
                          {getCategoryIcon(tech.category)}
                          <span className="ml-1 capitalize">{tech.category}</span>
                        </Badge>
                        {getStatusBadge(tech.status)}
                      </div>
                      <h3 className="font-semibold text-white mb-2">{tech.name}</h3>
                      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{tech.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Mass Ratio</span>
                        <span className={tech.massRatio === 0 ? 'text-green-400' : 'text-amber-400'}>
                          {tech.massRatio === 0 ? 'MASSLESS' : `${(tech.massRatio * 100).toFixed(2)}%`}
                        </span>
                      </div>
                      <Progress 
                        value={(1 - tech.massRatio) * 100} 
                        className="h-1 mt-2"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedTech && (
                <Card className="bg-black/60 border-purple-500/30 mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getCategoryIcon(selectedTech.category)}
                      {selectedTech.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300">{selectedTech.description}</p>
                    
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                      <div className="text-xs text-gray-500 mb-2">Physical Derivation</div>
                      <p className="text-gray-300 text-sm">{selectedTech.derivation}</p>
                    </div>

                    <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                      <div className="text-xs text-purple-400 mb-2">Lambda Equation</div>
                      <code className="text-purple-300 font-mono">{selectedTech.lambdaEquation}</code>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-3 bg-gray-800/50 rounded">
                        <div className="text-xs text-gray-500">X (Phase)</div>
                        <div className="font-mono text-cyan-400">{selectedTech.coordinates.x}°</div>
                      </div>
                      <div className="p-3 bg-gray-800/50 rounded">
                        <div className="text-xs text-gray-500">Y (Quadrature)</div>
                        <div className="font-mono text-cyan-400">{selectedTech.coordinates.y}°</div>
                      </div>
                      <div className="p-3 bg-gray-800/50 rounded">
                        <div className="text-xs text-gray-500">Z (Impedance)</div>
                        <div className="font-mono text-cyan-400">{selectedTech.coordinates.z}Ω</div>
                      </div>
                      <div className="p-3 bg-gray-800/50 rounded">
                        <div className="text-xs text-gray-500">T (Time)</div>
                        <div className="font-mono text-cyan-400">{selectedTech.coordinates.t}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sync" className="space-y-4">
              <Card className="bg-black/40 border-cyan-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={syncEnabled}
                        onCheckedChange={setSyncEnabled}
                        data-testid="sync-toggle"
                      />
                      <Label className="text-white">Enable Global Sync</Label>
                    </div>
                    {syncEnabled && (
                      <div className="flex items-center gap-4">
                        <Badge className="bg-green-500/20 text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {lockedCount}/{masslessTechnologies.length} Locked
                        </Badge>
                        <Badge className="bg-cyan-500/20 text-cyan-400">
                          Coherence: {(totalCoherence * 100).toFixed(2)}%
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label className="text-gray-400 text-sm">Global Phase (Golden Angle: 137.5°)</Label>
                      <Slider
                        value={[globalPhase]}
                        onValueChange={(v) => setGlobalPhase(v[0])}
                        min={0}
                        max={360}
                        step={0.1}
                        className="mt-2"
                        data-testid="global-phase-slider"
                      />
                      <div className="text-right text-sm font-mono text-cyan-400 mt-1">
                        {globalPhase.toFixed(1)}°
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-400 text-sm">Reference Frequency (THz)</Label>
                      <Slider
                        value={[globalFrequency]}
                        onValueChange={(v) => setGlobalFrequency(v[0])}
                        min={100}
                        max={1000}
                        step={1}
                        className="mt-2"
                        data-testid="global-freq-slider"
                      />
                      <div className="text-right text-sm font-mono text-purple-400 mt-1">
                        {globalFrequency} THz
                      </div>
                    </div>
                  </div>

                  {syncEnabled && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-400 mb-3">Sync Coordinate Matrix</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-2 text-gray-500">Technology</th>
                              <th className="text-right py-2 text-gray-500">Phase</th>
                              <th className="text-right py-2 text-gray-500">Frequency</th>
                              <th className="text-right py-2 text-gray-500">Z</th>
                              <th className="text-right py-2 text-gray-500">Coherence</th>
                              <th className="text-center py-2 text-gray-500">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {syncCoordinates.map((coord) => (
                              <tr key={coord.technology} className="border-b border-gray-800">
                                <td className="py-2 text-white capitalize">
                                  {coord.technology.replace(/-/g, ' ')}
                                </td>
                                <td className="text-right py-2 font-mono text-cyan-400">
                                  {coord.phase.toFixed(1)}°
                                </td>
                                <td className="text-right py-2 font-mono text-purple-400">
                                  {coord.frequency > 1e9 
                                    ? `${(coord.frequency / 1e12).toFixed(2)} THz`
                                    : `${coord.frequency.toFixed(2)} Hz`
                                  }
                                </td>
                                <td className="text-right py-2 font-mono text-amber-400">
                                  {coord.impedance.toFixed(1)}Ω
                                </td>
                                <td className="text-right py-2 font-mono text-green-400">
                                  {(coord.coherence * 100).toFixed(2)}%
                                </td>
                                <td className="text-center py-2">
                                  {coord.locked ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-amber-400 mx-auto" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="relative h-64 bg-black/40 rounded-lg border border-cyan-500/20 overflow-hidden">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  <defs>
                    <radialGradient id="syncGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>
                  
                  <circle cx="200" cy="100" r="80" fill="url(#syncGlow)" />
                  
                  {masslessTechnologies.map((tech, i) => {
                    const angle = (i * 45 + animationFrame) * (Math.PI / 180);
                    const radius = 60 + (tech.massRatio * 20);
                    const x = 200 + Math.cos(angle) * radius;
                    const y = 100 + Math.sin(angle) * radius;
                    const isLocked = syncCoordinates.find(c => c.technology === tech.id)?.locked;
                    
                    return (
                      <g key={tech.id}>
                        <line 
                          x1="200" 
                          y1="100" 
                          x2={x} 
                          y2={y} 
                          stroke={isLocked ? "#22c55e" : "#6366f1"}
                          strokeWidth="1"
                          strokeOpacity="0.5"
                        />
                        <circle 
                          cx={x} 
                          cy={y} 
                          r={tech.massRatio === 0 ? 6 : 4}
                          fill={isLocked ? "#22c55e" : "#6366f1"}
                          className="transition-all"
                        />
                        {tech.massRatio === 0 && (
                          <circle 
                            cx={x} 
                            cy={y} 
                            r="10"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="1"
                            strokeOpacity="0.5"
                          />
                        )}
                      </g>
                    );
                  })}
                  
                  <circle 
                    cx="200" 
                    cy="100" 
                    r="8"
                    fill="#8b5cf6"
                  />
                  <text x="200" y="105" textAnchor="middle" fill="white" fontSize="6">Λ</text>
                </svg>
                <div className="absolute bottom-2 left-2 text-xs text-gray-500">
                  Sync Coordinate Visualization | Green = Massless Lock
                </div>
              </div>
            </TabsContent>

            <TabsContent value="derivation" className="space-y-4">
              <Card className="bg-black/40 border-amber-500/30">
                <CardContent className="p-6 space-y-6">
                  <div className="text-center mb-8">
                    <div className="text-4xl font-mono text-amber-400 mb-4">Λ = hf/c²</div>
                    <p className="text-gray-400">The Lambda Boson Equation: Mass as Derivative of Frequency</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gray-900/50 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowRight className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 font-semibold">Step 1: First Oscillation</span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">
                          Frequency is fundamental. The First Oscillation at 555 THz represents 
                          the primordial vibration from which all matter derives.
                        </p>
                        <code className="text-xs text-purple-400 block bg-black/50 p-2 rounded">
                          f₀ = 555 × 10¹² Hz
                        </code>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowRight className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-400 font-semibold">Step 2: Energy Relation</span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">
                          Planck's relation E = hf establishes energy proportional to frequency.
                          Combined with E = mc², we derive the Lambda mass.
                        </p>
                        <code className="text-xs text-purple-400 block bg-black/50 p-2 rounded">
                          E = hf = mc² → m = hf/c²
                        </code>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowRight className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-semibold">Step 3: Massless Limit</span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">
                          When propagation velocity equals c, rest mass vanishes. 
                          Photons carry energy and momentum without rest mass.
                        </p>
                        <code className="text-xs text-purple-400 block bg-black/50 p-2 rounded">
                          v = c → m_rest = 0
                        </code>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-purple-900/30 to-cyan-900/30 rounded-lg border border-purple-500/30">
                    <h3 className="text-lg font-semibold text-white mb-4">Massless Technology Implications</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                        <div>
                          <span className="text-white">Photonic Computing</span>
                          <p className="text-gray-400 text-xs">Logic operations at speed of light</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                        <div>
                          <span className="text-white">Coherent Waveguides</span>
                          <p className="text-gray-400 text-xs">Phase-locked optical channels</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                        <div>
                          <span className="text-white">Zero-Point Extraction</span>
                          <p className="text-gray-400 text-xs">Cold vacuum energy harvesting</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                        <div>
                          <span className="text-white">Gravity De-correlation</span>
                          <p className="text-gray-400 text-xs">ZERO-G envelope via phase quadrature</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-gray-500 text-sm">
                    "Mass is not fundamental. It is the shadow cast by oscillation."
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
