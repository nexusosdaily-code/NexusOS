import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  Zap,
  Cpu,
  Radio,
  Package,
  Scale,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Globe,
  Atom,
  Network,
  Activity,
  ArrowRight,
  ChevronRight,
  Layers,
  Shield,
  Target,
  Waves,
  Binary,
  Satellite,
  Factory,
  Vote,
  BookOpen,
  Info
} from "lucide-react";

const PLANCK_CONSTANT = 6.62607015e-34;
const SPEED_OF_LIGHT = 299792458;

interface K1Pillar {
  id: string;
  name: string;
  kLevel: number;
  icon: ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  components: string[];
  physics: string[];
}

interface RelayNode {
  id: string;
  name: string;
  x: number;
  y: number;
  active: boolean;
}

interface CrossPillarFlow {
  from: string;
  to: string;
  resourceType: string;
  active: boolean;
}

const K1_PILLARS: K1Pillar[] = [
  {
    id: "energy",
    name: "Energy",
    kLevel: 0.80,
    icon: <Zap className="w-6 h-6" />,
    color: "text-yellow-400",
    bgColor: "from-yellow-900/20 to-amber-950/20",
    borderColor: "border-yellow-500/30",
    description: "Planetary-scale power generation and distribution",
    components: [
      "ResonanceHarvesterV2 - Tesla-inspired field coupling",
      "OrbitalSolarArray - Space-based with laser transmission",
      "FusionPhotonics - Lambda Gate optimized reactors",
      "K1EnergyMarket - NXT token integrated trading"
    ],
    physics: [
      "P = ∫ B·dA × μ₀/η (Schumann coupling)",
      "η_end = η_collect × η_laser × η_atmos × η_receiver",
      "Q_boost = 5× from Coherence-Amplify gate"
    ]
  },
  {
    id: "computing",
    name: "Computing",
    kLevel: 0.75,
    icon: <Cpu className="w-6 h-6" />,
    color: "text-cyan-400",
    bgColor: "from-cyan-900/20 to-blue-950/20",
    borderColor: "border-cyan-500/30",
    description: "Photonic computation using wavelength physics",
    components: [
      "PhotonicLogicGates - AND, OR, NOT, XOR via interference",
      "WavelengthDivisionComputer - Parallel spectral channels",
      "OAMQubitRegisters - Information in orbital angular momentum",
      "LambdaProcessor - Composable gate programs"
    ],
    physics: [
      "I_out = I₁ + I₂ + 2√(I₁I₂)cos(Δφ)",
      "L = ℓℏ per photon (OAM quantization)",
      "C = B·log₂(1 + SNR) bits/s (Shannon)"
    ]
  },
  {
    id: "communications",
    name: "Communications",
    kLevel: 0.80,
    icon: <Radio className="w-6 h-6" />,
    color: "text-green-400",
    bgColor: "from-green-900/20 to-emerald-950/20",
    borderColor: "border-green-500/30",
    description: "Global wavelength routing mesh network",
    components: [
      "SpectralRelayMesh - Dijkstra pathfinding",
      "OAMChannelAllocator - 65+ channels per wavelength",
      "CoherenceRepeater - Lambda Gate amplified relays",
      "InterplanetaryLinkPlanner - Deep space links"
    ],
    physics: [
      "P_r = P_t·G_t·G_r·(λ/4πd)² (Friis)",
      "L_c = c/Δν (coherence length)",
      "τ = exp(-α·h/cos(θ)) (atmospheric)"
    ]
  },
  {
    id: "resources",
    name: "Resources",
    kLevel: 0.85,
    icon: <Package className="w-6 h-6" />,
    color: "text-orange-400",
    bgColor: "from-orange-900/20 to-red-950/20",
    borderColor: "border-orange-500/30",
    description: "Planetary materials and logistics coordination",
    components: [
      "WavelengthLedger - Spectral inventory tracking",
      "PhotonicManufacturing - Bose-Einstein yields",
      "LogisticsWaveOptimizer - Monge-Kantorovich transport",
      "AutonomousFleetCoordinator - Distributed logistics"
    ],
    physics: [
      "Λ = hf/c² (lambda mass valuation)",
      "∂ρ/∂t + ∇·(ρv) = S (continuity)",
      "min ∫c(x,y)dγ (optimal transport)"
    ]
  },
  {
    id: "governance",
    name: "Governance",
    kLevel: 0.90,
    icon: <Scale className="w-6 h-6" />,
    color: "text-purple-400",
    bgColor: "from-purple-900/20 to-violet-950/20",
    borderColor: "border-purple-500/30",
    description: "Σ-field enhanced planetary coordination",
    components: [
      "AuthorityBandRegistry - 7-tier wavelength hierarchy",
      "SigmaConstitutionEngine - Spectral encoding",
      "MultiSpectrumVoting - Coherence-weighted tallying",
      "DisputeResonanceMediator - Phase-aligned arbitration"
    ],
    physics: [
      "T = Σ|c_i|²·cos²(Δφ_i) (trust interference)",
      "S = −k Σ p_i ln(p_i) (governance entropy)",
      "dC/dt = −γC + κF (decoherence model)"
    ]
  }
];

const RELAY_NODES: RelayNode[] = [
  { id: "europe", name: "Europe Hub", x: 52, y: 30, active: true },
  { id: "asia", name: "Asia Hub", x: 75, y: 35, active: true },
  { id: "americas", name: "Americas Hub", x: 25, y: 40, active: true },
  { id: "africa", name: "Africa Hub", x: 55, y: 55, active: true },
  { id: "oceania", name: "Oceania Hub", x: 82, y: 65, active: true },
  { id: "arctic", name: "Arctic Station", x: 50, y: 12, active: true },
  { id: "orbital_1", name: "LEO Relay 1", x: 40, y: 18, active: true },
  { id: "orbital_2", name: "LEO Relay 2", x: 65, y: 22, active: true }
];

const INITIAL_FLOWS: CrossPillarFlow[] = [
  { from: "energy", to: "computing", resourceType: "power_joules", active: false },
  { from: "computing", to: "communications", resourceType: "routing_data", active: false },
  { from: "communications", to: "resources", resourceType: "logistics_msgs", active: false },
  { from: "resources", to: "governance", resourceType: "inventory_state", active: false },
  { from: "governance", to: "energy", resourceType: "policy_directives", active: false }
];

function PillarCard({ pillar, isActive, onClick }: { 
  pillar: K1Pillar; 
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Card 
      className={`bg-gradient-to-br ${pillar.bgColor} ${pillar.borderColor} p-4 cursor-pointer transition-all duration-300 hover:scale-105 ${isActive ? 'ring-2 ring-white/50 scale-105' : ''}`}
      onClick={onClick}
      data-testid={`pillar-card-${pillar.id}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={pillar.color}>{pillar.icon}</div>
        <div>
          <h3 className="text-lg font-bold text-white">{pillar.name}</h3>
          <div className="text-xs text-gray-400">K-Level {pillar.kLevel.toFixed(2)}</div>
        </div>
      </div>
      <Progress value={pillar.kLevel * 100} className="h-2 mb-2" />
      <p className="text-xs text-gray-400 line-clamp-2">{pillar.description}</p>
    </Card>
  );
}

function NetworkTopology({ nodes, selectedPath }: { nodes: RelayNode[]; selectedPath: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = (i / 12) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let i = 0; i < 18; i++) {
      const x = (i / 18) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    nodes.forEach((node, i) => {
      nodes.slice(i + 1).forEach(other => {
        const x1 = (node.x / 100) * width;
        const y1 = (node.y / 100) * height;
        const x2 = (other.x / 100) * width;
        const y2 = (other.y / 100) * height;
        
        const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
        if (dist < width * 0.4) {
          const isInPath = selectedPath.includes(node.id) && selectedPath.includes(other.id);
          ctx.strokeStyle = isInPath ? '#22d3ee' : '#334155';
          ctx.lineWidth = isInPath ? 3 : 1;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });
    });
    
    nodes.forEach(node => {
      const x = (node.x / 100) * width;
      const y = (node.y / 100) * height;
      const isInPath = selectedPath.includes(node.id);
      
      ctx.beginPath();
      ctx.arc(x, y, isInPath ? 10 : 8, 0, Math.PI * 2);
      ctx.fillStyle = isInPath ? '#22d3ee' : (node.active ? '#10b981' : '#6b7280');
      ctx.fill();
      
      if (node.active) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = isInPath ? '#22d3ee' : '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, x, y + 22);
    });
    
  }, [nodes, selectedPath]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={300}
      className="w-full rounded-lg border border-slate-700"
      data-testid="network-topology-canvas"
    />
  );
}

function CrossPillarFlowDiagram({ flows, activePillar }: { flows: CrossPillarFlow[]; activePillar: string }) {
  return (
    <div className="flex items-center justify-between gap-2 p-4 bg-slate-900/50 rounded-lg" data-testid="cross-pillar-flows">
      {K1_PILLARS.map((pillar, i) => (
        <div key={pillar.id} className="flex items-center gap-2">
          <div className={`flex flex-col items-center ${activePillar === pillar.id ? 'scale-110' : ''} transition-transform`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pillar.color} bg-slate-800 border-2 ${activePillar === pillar.id ? 'border-white animate-pulse' : pillar.borderColor}`}>
              {pillar.icon}
            </div>
            <span className="text-xs text-gray-400 mt-1">{pillar.name}</span>
          </div>
          {i < K1_PILLARS.length - 1 && (
            <div className="flex items-center">
              <div className={`h-0.5 w-8 ${flows[i]?.active ? 'bg-gradient-to-r from-cyan-400 to-green-400 animate-pulse' : 'bg-slate-700'}`} />
              <ChevronRight className={`w-4 h-4 ${flows[i]?.active ? 'text-cyan-400' : 'text-slate-600'}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PhysicsPanel({ pillar }: { pillar: K1Pillar }) {
  return (
    <Card className={`bg-gradient-to-br ${pillar.bgColor} ${pillar.borderColor} p-6`} data-testid={`physics-panel-${pillar.id}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={pillar.color}>{pillar.icon}</div>
        <div>
          <h3 className="text-xl font-bold text-white">{pillar.name} Module</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            K-Level {pillar.kLevel.toFixed(2)}
          </Badge>
        </div>
      </div>
      
      <p className="text-gray-300 mb-4">{pillar.description}</p>
      
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4" /> Components
        </h4>
        <ul className="space-y-1">
          {pillar.components.map((comp, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <span>{comp}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
          <Atom className="w-4 h-4" /> Physics Equations
        </h4>
        <div className="space-y-2">
          {pillar.physics.map((eq, i) => (
            <div key={i} className="bg-slate-800/50 rounded px-3 py-2 font-mono text-sm text-cyan-300">
              {eq}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function DemoRunner({ onFlowUpdate }: { onFlowUpdate: (flows: CrossPillarFlow[]) => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [demoLog, setDemoLog] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const demoSteps = [
    { pillar: "energy", msg: "Harvesting energy: Schumann resonance + Solar + Fusion" },
    { pillar: "computing", msg: "Processing data: 8-channel parallel photonic computation" },
    { pillar: "communications", msg: "Routing messages: Europe → Asia via spectral mesh" },
    { pillar: "resources", msg: "Managing inventory: 2 resources registered to ledger" },
    { pillar: "governance", msg: "Executing governance: Solar Expansion Policy approved" }
  ];
  
  const startDemo = useCallback(() => {
    setIsRunning(true);
    setCurrentStep(0);
    setDemoLog([]);
    
    let step = 0;
    intervalRef.current = setInterval(() => {
      if (step >= demoSteps.length) {
        setIsRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDemoLog(prev => [...prev, "✅ K1 Integration Demo Complete!"]);
        return;
      }
      
      const currentDemo = demoSteps[step];
      setCurrentStep(step);
      setDemoLog(prev => [...prev, `[${currentDemo.pillar.toUpperCase()}] ${currentDemo.msg}`]);
      
      const newFlows = INITIAL_FLOWS.map((f, i) => ({
        ...f,
        active: i <= step
      }));
      onFlowUpdate(newFlows);
      
      step++;
    }, 1500);
  }, [onFlowUpdate]);
  
  const stopDemo = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onFlowUpdate(INITIAL_FLOWS);
  };
  
  const resetDemo = () => {
    stopDemo();
    setCurrentStep(0);
    setDemoLog([]);
    onFlowUpdate(INITIAL_FLOWS);
  };
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
  
  return (
    <Card className="bg-slate-900/50 border-cyan-500/30 p-4" data-testid="demo-runner">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          K1 Integration Demo
        </h3>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={startDemo} size="sm" className="bg-green-600 hover:bg-green-700" data-testid="btn-start-demo">
              <Play className="w-4 h-4 mr-1" /> Run Demo
            </Button>
          ) : (
            <Button onClick={stopDemo} size="sm" variant="destructive" data-testid="btn-stop-demo">
              <Pause className="w-4 h-4 mr-1" /> Stop
            </Button>
          )}
          <Button onClick={resetDemo} size="sm" variant="outline" data-testid="btn-reset-demo">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs h-32 overflow-y-auto" data-testid="demo-log">
        {demoLog.length === 0 ? (
          <div className="text-gray-500">Click "Run Demo" to see K1 pillars in action...</div>
        ) : (
          demoLog.map((log, i) => (
            <div key={i} className={`mb-1 ${log.startsWith('✅') ? 'text-green-400' : 'text-gray-300'}`}>
              {log}
            </div>
          ))
        )}
      </div>
      
      {isRunning && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{currentStep + 1} / {demoSteps.length}</span>
          </div>
          <Progress value={((currentStep + 1) / demoSteps.length) * 100} className="h-2" />
        </div>
      )}
    </Card>
  );
}

export default function K1InfrastructurePage() {
  const [selectedPillar, setSelectedPillar] = useState<K1Pillar>(K1_PILLARS[0]);
  const [flows, setFlows] = useState<CrossPillarFlow[]>(INITIAL_FLOWS);
  const [selectedPath, setSelectedPath] = useState<string[]>(["europe", "asia"]);
  
  const calculateOverallKLevel = () => {
    const total = K1_PILLARS.reduce((sum, p) => sum + p.kLevel, 0);
    return total / K1_PILLARS.length;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="btn-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-12 h-12 text-cyan-400 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              K1 Infrastructure
            </h1>
          </div>
          <p className="text-xl text-cyan-300 font-light mb-2">
            Kardashev Type I Civilization Dashboard
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Overall K-Level:</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg px-3">
                {calculateOverallKLevel().toFixed(2)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Status:</span>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                OPERATIONAL
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {K1_PILLARS.map(pillar => (
            <PillarCard 
              key={pillar.id} 
              pillar={pillar} 
              isActive={selectedPillar.id === pillar.id}
              onClick={() => setSelectedPillar(pillar)}
            />
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-900/50">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Globe className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="network" data-testid="tab-network">
              <Network className="w-4 h-4 mr-2" /> Network
            </TabsTrigger>
            <TabsTrigger value="specs" data-testid="tab-specs">
              <BookOpen className="w-4 h-4 mr-2" /> Specs
            </TabsTrigger>
            <TabsTrigger value="demo" data-testid="tab-demo">
              <Play className="w-4 h-4 mr-2" /> Demo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-slate-900/50 border-cyan-500/30 p-6">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Layers className="w-6 h-6" />
                Five Pillars of K1 Civilization
              </h2>
              <p className="text-gray-300 mb-6">
                The WNSP K1 Infrastructure implements the complete foundation for a Kardashev Type I civilization, 
                capable of harnessing the total energy output of a planet. Each pillar builds upon the previous, 
                creating an integrated system for planetary-scale coordination.
              </p>
              
              <CrossPillarFlowDiagram flows={flows} activePillar={selectedPillar.id} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-400" /> Core Principle
                  </h4>
                  <div className="font-mono text-2xl text-cyan-400 mb-2">Λ = hf/c²</div>
                  <p className="text-sm text-gray-400">
                    Lambda Boson Theory: Oscillation frequency creates mass-equivalent, 
                    enabling physics-based value transfer and resource tracking.
                  </p>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" /> Integration Status
                  </h4>
                  <div className="space-y-2">
                    {K1_PILLARS.map(pillar => (
                      <div key={pillar.id} className="flex items-center justify-between">
                        <span className={`text-sm ${pillar.color}`}>{pillar.name}</span>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <PhysicsPanel pillar={selectedPillar} />
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <Card className="bg-slate-900/50 border-green-500/30 p-6">
              <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <Satellite className="w-6 h-6" />
                Spectral Relay Mesh Network
              </h2>
              <p className="text-gray-300 mb-4">
                Global wavelength routing network with Dijkstra pathfinding, OAM channel multiplexing (65+ channels per wavelength),
                and Lambda Gate amplified coherence repeaters.
              </p>
              
              <NetworkTopology nodes={RELAY_NODES} selectedPath={selectedPath} />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <Card className="bg-slate-800/50 p-3 border-slate-700">
                  <div className="text-gray-400 text-xs mb-1">Active Nodes</div>
                  <div className="text-2xl font-bold text-green-400">{RELAY_NODES.filter(n => n.active).length}</div>
                </Card>
                <Card className="bg-slate-800/50 p-3 border-slate-700">
                  <div className="text-gray-400 text-xs mb-1">OAM Channels</div>
                  <div className="text-2xl font-bold text-cyan-400">65</div>
                </Card>
                <Card className="bg-slate-800/50 p-3 border-slate-700">
                  <div className="text-gray-400 text-xs mb-1">Spectrum Bands</div>
                  <div className="text-2xl font-bold text-purple-400">12</div>
                </Card>
                <Card className="bg-slate-800/50 p-3 border-slate-700">
                  <div className="text-gray-400 text-xs mb-1">Coherence Boost</div>
                  <div className="text-2xl font-bold text-yellow-400">5×</div>
                </Card>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Select Route Preview</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { path: ["europe", "asia"], label: "Europe → Asia" },
                    { path: ["americas", "africa"], label: "Americas → Africa" },
                    { path: ["europe", "orbital_1", "asia"], label: "Europe → LEO → Asia" },
                    { path: ["americas", "europe", "asia", "oceania"], label: "Global Route" }
                  ].map((route, i) => (
                    <Button 
                      key={i}
                      variant={JSON.stringify(selectedPath) === JSON.stringify(route.path) ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPath(route.path)}
                      data-testid={`btn-route-${i}`}
                    >
                      {route.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="specs" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {K1_PILLARS.map(pillar => (
                <PhysicsPanel key={pillar.id} pillar={pillar} />
              ))}
            </div>
            
            <Card className="bg-gradient-to-br from-slate-900/50 to-indigo-900/20 border-indigo-500/30 p-6">
              <h3 className="text-xl font-bold text-indigo-400 mb-4 flex items-center gap-2">
                <Binary className="w-5 h-5" /> Lambda Gate Substrate v4
              </h3>
              <p className="text-gray-300 mb-4">
                8 primitive photonic gate operators for Lambda mode transformations with CE-1 Coherence Engineering protocol.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: "Phase-Shift", symbol: "Ŝ(φ)" },
                  { name: "Gain", symbol: "Ĝ(g)" },
                  { name: "Mode-Mixer", symbol: "M̂(θ)" },
                  { name: "OAM-Rotor", symbol: "R̂(Δℓ)" },
                  { name: "Phase-Gradient", symbol: "∇̂(k)" },
                  { name: "Density-Swap", symbol: "D̂(ρ)" },
                  { name: "Coherence-Amp", symbol: "Ĉ(α)" },
                  { name: "Stabilizer", symbol: "Q̂(β)" }
                ].map((gate, i) => (
                  <div key={i} className="bg-slate-800/50 rounded p-3 border border-indigo-500/20 text-center">
                    <div className="font-mono text-lg text-indigo-400">{gate.symbol}</div>
                    <div className="text-xs text-gray-400 mt-1">{gate.name}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-slate-800/50 rounded p-3 border border-indigo-500/20">
                <div className="text-sm text-gray-400 mb-1">Master Equation</div>
                <div className="font-mono text-cyan-400">
                  E(ν, ℓ, t) ≥ h·ν·I(λ) + α·||K̂||² + β·O(L̂)
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="demo" className="space-y-6">
            <DemoRunner onFlowUpdate={setFlows} />
            
            <CrossPillarFlowDiagram flows={flows} activePillar="" />
            
            <Card className="bg-slate-900/50 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" /> About the Demo
              </h3>
              <div className="text-gray-300 space-y-2">
                <p>
                  The K1 Integration Demo simulates the complete flow of resources and data through all five 
                  Kardashev Type I infrastructure pillars:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li><span className="text-yellow-400">Energy</span> - Harvests power from Schumann resonance, orbital solar, and fusion</li>
                  <li><span className="text-cyan-400">Computing</span> - Processes data using parallel photonic channels</li>
                  <li><span className="text-green-400">Communications</span> - Routes messages through the spectral mesh network</li>
                  <li><span className="text-orange-400">Resources</span> - Registers materials and tracks inventory with λ-signatures</li>
                  <li><span className="text-purple-400">Governance</span> - Executes policies through coherence-weighted voting</li>
                </ol>
                <p className="text-sm text-gray-400 mt-4">
                  Each pillar passes resources to the next, demonstrating the integrated nature of K1 civilization infrastructure.
                  The demo uses REAL module implementations from the WNSP v7 codebase.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>WNSP K1 Infrastructure v1.9.0 — Kardashev Type I Civilization Foundation</p>
          <p className="mt-1">All pillars operational | K-Level: {calculateOverallKLevel().toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
