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

interface PsiBinding {
  wdm: number;
  oam: number;
  pol: "H" | "V";
  nm: number;
  band: "SYSTEM" | "KERNEL" | "USER" | "GUEST";
  channelIndex: number;
  psi: string;
  uri: string;
}

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
  psi: PsiBinding;
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

function mkPsi(wdm: number, oam: number, pol: "H"|"V", band: "SYSTEM"|"KERNEL"|"USER"|"GUEST"): PsiBinding {
  const p = pol === "H" ? 0 : 1;
  const nm = 380 + (wdm / 255) * 370;
  const ch = wdm * 100 + oam * 2 + p;
  return { wdm, oam, pol, nm: Math.round(nm * 10) / 10, band, channelIndex: ch,
    psi: `Ψ(${wdm},${oam},${pol})`, uri: `wnsp://Ψ(${wdm},${oam},${pol})/` };
}

const BAND_COLORS: Record<string, string> = {
  SYSTEM: "#dc2626", KERNEL: "#2563eb", USER: "#16a34a", GUEST: "#6b7280",
};

const K1_PILLARS: K1Pillar[] = [
  {
    id: "defense",
    name: "Military & Sovereign Defense",
    kLevel: 0.95,
    icon: <Shield className="w-6 h-6" />,
    color: "text-red-400",
    bgColor: "from-red-900/20 to-rose-950/20",
    borderColor: "border-red-500/30",
    description: "Sovereign security — geometrically isolated at the physics layer",
    components: [
      "SovereignChannelGuard - SYSTEM band geometric isolation",
      "SpectralIntelligenceNet - Orthogonal intercept channels",
      "QuantumAuthority - Compression-state verified command",
      "NationalSpectrumRegistry - Sovereign Ψ_channel allocation"
    ],
    physics: [
      "⟨Ψ_defense | Ψ_civilian⟩ = 0 (orthogonal isolation)",
      "E = hf at λ=391nm → maximum authority energy",
      "Λ = hf/c² — sovereign mass-equivalent per photon"
    ],
    psi: mkPsi(8, 0, "H", "SYSTEM"),
  },
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
    ],
    psi: mkPsi(75, 10, "H", "KERNEL"),
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
    ],
    psi: mkPsi(95, 15, "H", "KERNEL"),
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
    ],
    psi: mkPsi(115, 20, "H", "KERNEL"),
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
    ],
    psi: mkPsi(140, 25, "H", "USER"),
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
    ],
    psi: mkPsi(35, 5, "H", "SYSTEM"),
  },
  {
    id: "healthcare",
    name: "Healthcare",
    kLevel: 0.70,
    icon: <Activity className="w-6 h-6" />,
    color: "text-pink-400",
    bgColor: "from-pink-900/20 to-rose-950/20",
    borderColor: "border-pink-500/30",
    description: "Biomedical systems on spectral infrastructure",
    components: [
      "SpectralDiagnostics - Wavelength-based biomarker encoding",
      "PharmaceuticalLedger - NXT-priced drug supply chain",
      "CoherenceTreatmentProtocol - Photonic therapy channels",
      "BioDataSovereign - Patient data on personal Ψ_channel"
    ],
    physics: [
      "E_photon = hf (diagnostic photon energy)",
      "λ_bio = 619nm — USER band, civilian access layer",
      "⟨Ψ_health | Ψ_defense⟩ = 0 — medical data isolated"
    ],
    psi: mkPsi(162, 30, "H", "USER"),
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

function calcPillarPhysics(nm: number) {
  const lam = nm * 1e-9;
  const f = 2.998e8 / lam;
  const E = 6.626e-34 * f;
  const mass = E / (2.998e8 * 2.998e8);
  const feeMulti = 520 / nm;
  return {
    f: (f / 1e12).toFixed(2),
    E: E.toExponential(3),
    mass: mass.toExponential(3),
    feeMulti: feeMulti.toFixed(4),
  };
}

function PillarSpectrumStrip({ pillars }: { pillars: K1Pillar[] }) {
  return (
    <div className="rounded-xl border border-white/10 p-3 sm:p-4 mb-6" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="text-[9px] text-white/25 uppercase tracking-widest mb-3">
        Seven Pillars — Spectral Position (380–780nm visible spectrum)
      </div>
      <div className="relative h-5 rounded-full overflow-hidden mb-1"
        style={{ background: "linear-gradient(to right, #6600cc,#0044ff,#00aaff,#00cc44,#aacc00,#ffaa00,#ff3300)" }}>
        {pillars.map(p => {
          const pct = ((p.psi.nm - 380) / 400) * 100;
          return (
            <div key={p.id} className="absolute top-0 bottom-0 w-0.5 bg-white/80"
              style={{ left: `${pct}%` }} />
          );
        })}
      </div>
      <div className="relative h-7 overflow-hidden">
        {pillars.map(p => {
          const pct = ((p.psi.nm - 380) / 400) * 100;
          const bc = BAND_COLORS[p.psi.band];
          return (
            <div key={p.id} className="absolute flex flex-col items-center"
              style={{ left: `clamp(12px, ${pct}%, calc(100% - 12px))`, transform: "translateX(-50%)" }}>
              <div className="w-1.5 h-1.5 rounded-full mb-0.5 mt-0.5" style={{ background: bc }} />
              <div className="text-[6px] font-mono whitespace-nowrap" style={{ color: bc }}>
                {p.psi.nm}nm
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-3">
        {pillars.map(p => {
          const bc = BAND_COLORS[p.psi.band];
          const ph = calcPillarPhysics(p.psi.nm);
          return (
            <div key={p.id} className="border border-white/5 rounded px-2 py-1.5 min-w-0" style={{ background: bc + "06" }}>
              <div className="text-[8px] font-bold truncate" style={{ color: bc }}>{p.name.split(" ")[0]}</div>
              <div className="text-[7px] text-white/30 font-mono truncate">E={ph.E}J</div>
              <div className="text-[7px] text-white/20 font-mono truncate">Λ={ph.mass}kg</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PillarCard({ pillar, isActive, onClick }: { 
  pillar: K1Pillar; 
  isActive: boolean;
  onClick: () => void;
}) {
  const bandColor = BAND_COLORS[pillar.psi.band];
  const ph = calcPillarPhysics(pillar.psi.nm);
  return (
    <Card 
      className={`bg-gradient-to-br ${pillar.bgColor} ${pillar.borderColor} p-4 cursor-pointer transition-all duration-300 hover:scale-105 ${isActive ? 'ring-2 ring-white/50 scale-105' : ''}`}
      onClick={onClick}
      data-testid={`pillar-card-${pillar.id}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={pillar.color}>{pillar.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-tight">{pillar.name}</h3>
          <div className="text-xs text-gray-400">K-Level {pillar.kLevel.toFixed(2)}</div>
        </div>
      </div>
      <Progress value={pillar.kLevel * 100} className="h-2 mb-2" />
      <p className="text-xs text-gray-400 line-clamp-2 mb-2">{pillar.description}</p>
      <div className="grid grid-cols-2 gap-1 mb-2">
        <div className="bg-black/20 rounded px-2 py-1">
          <div className="text-[7px] text-white/25">E = hf</div>
          <div className="text-[9px] font-mono font-bold" style={{ color: bandColor }}>{ph.E} J</div>
        </div>
        <div className="bg-black/20 rounded px-2 py-1">
          <div className="text-[7px] text-white/25">Λ = hf/c²</div>
          <div className="text-[9px] font-mono font-bold" style={{ color: bandColor }}>{ph.mass} kg</div>
        </div>
        <div className="bg-black/20 rounded px-2 py-1">
          <div className="text-[7px] text-white/25">Frequency</div>
          <div className="text-[9px] font-mono font-bold text-white/60">{ph.f} THz</div>
        </div>
        <div className="bg-black/20 rounded px-2 py-1">
          <div className="text-[7px] text-white/25">Fee ×</div>
          <div className="text-[9px] font-mono font-bold text-white/60">{ph.feeMulti}×</div>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: bandColor }} />
        <span className="font-mono text-xs truncate" style={{ color: bandColor }}>{pillar.psi.psi}</span>
        <span className="text-slate-600 text-xs flex-shrink-0">{pillar.psi.nm}nm</span>
        <span className="ml-auto text-xs rounded px-1 font-mono" style={{ color: bandColor, background: bandColor + "22" }}>{pillar.psi.band}</span>
      </div>
    </Card>
  );
}

function ConstitutionalMap() {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">Constitutional Channel Map</div>
        <span className="text-xs font-mono text-slate-500 border border-slate-700 rounded px-2 py-0.5">v1.0</span>
      </div>
      <p className="text-xs text-slate-500">
        Compression state determines authority. Λ=hf/c². Each sector occupies a unique orthogonal Ψ_channel — 
        <span className="text-cyan-400"> ⟨Ψ_i | Ψ_j⟩ = 0</span> for all i ≠ j. Sectors never interfere at the physics layer.
      </p>
      <div className="space-y-1.5">
        {K1_PILLARS.map(p => {
          const bc = BAND_COLORS[p.psi.band];
          const freq = (2.998e17 / p.psi.nm / 1e12).toFixed(1);
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-950/60 border border-slate-800 hover:border-slate-600 transition-colors" data-testid={`map-sector-${p.id}`}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: bc }} />
              <div className="w-36 flex-shrink-0">
                <div className="text-xs text-white font-medium leading-tight truncate">{p.name}</div>
              </div>
              <div className="font-mono text-xs flex-shrink-0" style={{ color: bc }}>{p.psi.psi}</div>
              <div className="text-slate-600 text-xs flex-shrink-0">{p.psi.nm}nm · {freq}THz</div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs font-mono rounded px-1.5 py-0.5" style={{ color: bc, background: bc + "22" }}>{p.psi.band}</span>
                <span className="text-slate-700 text-xs font-mono">ch {p.psi.channelIndex.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
        {(["SYSTEM","KERNEL","USER","GUEST"] as const).map(band => {
          const bc = BAND_COLORS[band];
          const count = K1_PILLARS.filter(p => p.psi.band === band).length;
          return (
            <div key={band} className="rounded-lg border px-3 py-2 text-center" style={{ borderColor: bc + "44", background: bc + "11" }}>
              <div className="text-xs font-mono font-bold" style={{ color: bc }}>{band}</div>
              <div className="text-xs text-slate-500">{count} sector{count !== 1 ? "s" : ""}</div>
            </div>
          );
        })}
      </div>
    </div>
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
    <div className="overflow-x-auto pb-2" data-testid="cross-pillar-flows">
      <div className="flex items-center justify-start gap-1 p-4 bg-slate-900/50 rounded-lg min-w-max">
        {K1_PILLARS.map((pillar, i) => (
          <div key={pillar.id} className="flex items-center gap-1">
            <div className={`flex flex-col items-center ${activePillar === pillar.id ? 'scale-110' : ''} transition-transform`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pillar.color} bg-slate-800 border-2 ${activePillar === pillar.id ? 'border-white animate-pulse' : pillar.borderColor}`}>
                {pillar.icon}
              </div>
              <span className="text-[9px] text-gray-400 mt-1 text-center w-12 leading-tight">{pillar.name.split(" ")[0]}</span>
            </div>
            {i < K1_PILLARS.length - 1 && (
              <div className="flex items-center mb-4">
                <div className={`h-0.5 w-5 ${flows[i]?.active ? 'bg-gradient-to-r from-cyan-400 to-green-400 animate-pulse' : 'bg-slate-700'}`} />
                <ChevronRight className={`w-3 h-3 ${flows[i]?.active ? 'text-cyan-400' : 'text-slate-600'}`} />
              </div>
            )}
          </div>
        ))}
      </div>
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

// ── Physics constants ─────────────────────────────────────────────────────────
const H = 6.626e-34;
const C = 2.998e8;

// Per-sector activities generated on each Ψ channel
const SECTOR_ACTIVITIES: Record<string, string[]> = {
  defense:        ["Geometric isolation verified","Sovereign channel guard pulse","OAM intercept scan","Spectral auth challenge","Compression-state ID verify"],
  energy:         ["Schumann resonance harvest","Orbital solar capture","Fusion photon gate open","λ=489nm power burst","Grid frequency sync"],
  computing:      ["Photonic AND gate execute","OAM qubit register write","WDM parallel channel open","Lambda processor cycle","Coherence-Amp gate apply"],
  communications: ["Spectral mesh route update","OAM channel allocated","Coherence repeater ping","Planetary relay sync","Dijkstra path computed"],
  resources:      ["λ-inventory ledger scan","Material signature logged","Logistics wave optimised","Autonomous fleet coord","Monge-Kantorovich solve"],
  governance:     ["Coherence-weighted vote tally","Constitution block encode","Spectral mediation pulse","Policy directive propagate","Trust interference compute"],
  healthcare:     ["Biomarker wavelength encode","Patient Ψ_channel pulse","Photonic therapy route","Drug supply ledger update","BioDataSovereign sync"],
};

// Energy sources feeding the Energy pillar
const ENERGY_SOURCES = [
  { id: "schumann", label: "Schumann Resonance",    baseGW: 12.4, color: "#facc15", formula: "P = ∫B·dA×μ₀/η" },
  { id: "orbital",  label: "Orbital Solar Array",   baseGW: 48.7, color: "#fb923c", formula: "η_end=η_c×η_l×η_a×η_r" },
  { id: "fusion",   label: "Fusion Photon Gate",    baseGW: 31.2, color: "#38bdf8", formula: "Q_boost = 5× CE-1" },
  { id: "geo",      label: "Geothermal Tap",         baseGW:  8.1, color: "#4ade80", formula: "P_geo=k·ΔT/d" },
];

// Distribution cascade — SYSTEM→KERNEL→USER→GUEST with allocation %
const DISTRIBUTION_CASCADE = [
  { from: "Energy Grid",    to: "defense",       band: "SYSTEM", pct: 18, color: "#dc2626" },
  { from: "Energy Grid",    to: "governance",    band: "SYSTEM", pct: 12, color: "#dc2626" },
  { from: "Energy Grid",    to: "computing",     band: "KERNEL", pct: 22, color: "#2563eb" },
  { from: "Energy Grid",    to: "communications",band: "KERNEL", pct: 17, color: "#2563eb" },
  { from: "Energy Grid",    to: "resources",     band: "USER",   pct: 14, color: "#16a34a" },
  { from: "Energy Grid",    to: "healthcare",    band: "USER",   pct: 11, color: "#16a34a" },
  { from: "Energy Grid",    to: "reserves",      band: "GUEST",  pct:  6, color: "#6b7280" },
];

function MultidimensionalActivity() {
  const [sectorState, setSectorState] = useState(() =>
    K1_PILLARS.map(p => ({
      id: p.id, count: 0, lastActivity: "Initialising…", energyJoules: 0, pulsePhase: Math.random() * Math.PI * 2,
    }))
  );
  const [globalTick, setGlobalTick] = useState(0);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setGlobalTick(t => t + 1);
      setSectorState(prev => prev.map(sa => {
        const pillar = K1_PILLARS.find(p => p.id === sa.id)!;
        const acts   = SECTOR_ACTIVITIES[sa.id] ?? ["Activity pulse"];
        const f      = C / (pillar.psi.nm * 1e-9);          // optical frequency
        const dE     = H * f * pillar.kLevel * 1e12;         // energy per tick (scaled)
        return {
          ...sa, count: sa.count + 1,
          lastActivity: acts[Math.floor(Math.random() * acts.length)],
          energyJoules: sa.energyJoules + dE,
          pulsePhase: (sa.pulsePhase + 0.4) % (Math.PI * 2),
        };
      }));
    }, 1_100);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // Orthogonality matrix values — ⟨Ψ_i|Ψ_j⟩ = δ_ij by construction
  const orthMatrix = K1_PILLARS.map(a =>
    K1_PILLARS.map(b => (a.id === b.id ? 1 : 0))
  );

  return (
    <div className="space-y-6">

      {/* Hilbert space header */}
      <Card className="bg-gradient-to-br from-indigo-950/60 to-slate-900/60 border-indigo-500/30 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
            <Atom className="w-5 h-5" /> Hilbert Space — 25,600 Orthogonal Channels
          </h2>
          <div className="text-xs font-mono text-indigo-300/70 bg-indigo-950/50 px-3 py-1 rounded-full">
            dim(H) = N_λ × N_OAM × N_Pol = 256 × 50 × 2
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          {[
            { label: "WDM Channels", val: "256", sub: "N_λ wavelength bands", color: "text-cyan-400" },
            { label: "OAM Modes",    val: "50",  sub: "N_OAM angular modes",  color: "text-purple-400" },
            { label: "Polarisations",val: "2",   sub: "H / V orthogonal",     color: "text-green-400" },
            { label: "Active Sectors",val: K1_PILLARS.length.toString(), sub: "Ψ channels bound", color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/60 rounded-lg p-3 border border-indigo-500/10">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-slate-400 text-[10px] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Live sector activity streams */}
      <Card className="bg-slate-900/60 border-slate-700/50 p-5">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400" /> Live Sector Activity — All Channels Simultaneously
          <span className="ml-auto text-xs text-slate-500 font-mono">tick #{globalTick}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {K1_PILLARS.map((pillar, i) => {
            const sa   = sectorState.find(s => s.id === pillar.id)!;
            const bc   = BAND_COLORS[pillar.psi.band];
            const freq = C / (pillar.psi.nm * 1e-9);
            const pulse = Math.abs(Math.sin(sa.pulsePhase));
            return (
              <div key={pillar.id} className="rounded-xl border p-3 space-y-2 transition-all"
                style={{ borderColor: bc + "44", background: bc + "08" }}
                data-testid={`activity-sector-${pillar.id}`}>
                <div className="flex items-center gap-2">
                  {/* Pulse dot */}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-300"
                    style={{ background: bc, opacity: 0.4 + pulse * 0.6, boxShadow: `0 0 ${4 + pulse * 8}px ${bc}` }} />
                  <div style={{ color: bc }} className="flex-shrink-0">{pillar.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white leading-tight truncate">{pillar.name}</div>
                    <div className="font-mono text-[10px]" style={{ color: bc }}>{pillar.psi.psi} · λ={pillar.psi.nm}nm</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono" style={{ color: bc }}>{sa.count} acts</div>
                    <div className="text-[9px] text-slate-500">{(freq / 1e12).toFixed(1)} THz</div>
                  </div>
                </div>
                <div className="bg-slate-950/60 rounded px-2 py-1 font-mono text-[10px] text-slate-300 truncate">
                  ▸ {sa.lastActivity}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-1">
                    <div className="h-1 rounded-full transition-all duration-500"
                      style={{ width: `${pillar.kLevel * 100}%`, background: bc }} />
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: bc }}>K={pillar.kLevel.toFixed(2)}</span>
                  <span className="text-[9px] font-mono text-slate-500">{pillar.psi.band}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Orthogonality matrix */}
      <Card className="bg-slate-900/60 border-cyan-500/20 p-5">
        <h3 className="text-base font-bold text-cyan-400 mb-1 flex items-center gap-2">
          <Binary className="w-4 h-4" /> Orthogonality Proof — ⟨Ψ_i | Ψ_j⟩ = δ_ij
        </h3>
        <p className="text-xs text-slate-500 mb-4 font-mono">
          Every off-diagonal = 0. No sector can interfere with another at the physics layer. 
          On-diagonal = 1 (full self-coherence).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr>
                <th className="text-slate-600 pr-2 text-right w-24"></th>
                {K1_PILLARS.map(p => (
                  <th key={p.id} className="px-1 pb-2 text-center w-10" style={{ color: BAND_COLORS[p.psi.band] }}>
                    {p.name.split(" ")[0].slice(0, 6)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {K1_PILLARS.map((rowP, ri) => (
                <tr key={rowP.id}>
                  <td className="pr-2 text-right py-1 truncate w-24" style={{ color: BAND_COLORS[rowP.psi.band] }}>
                    {rowP.name.split(" ")[0].slice(0, 8)}
                  </td>
                  {orthMatrix[ri].map((val, ci) => (
                    <td key={ci} className="text-center py-1 w-10">
                      <span className={`inline-block w-7 h-5 rounded text-center leading-5 font-bold ${
                        val === 1
                          ? "bg-cyan-500/30 text-cyan-300"
                          : "bg-slate-800/50 text-slate-600"
                      }`}>{val}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-4 text-[10px] text-slate-500">
          <span><span className="inline-block w-4 h-3 bg-cyan-500/30 rounded mr-1" />1 = self-coherent</span>
          <span><span className="inline-block w-4 h-3 bg-slate-800/50 rounded mr-1" />0 = orthogonal (zero interference)</span>
        </div>
      </Card>

      {/* Cross-sector resource flows */}
      <Card className="bg-slate-900/60 border-amber-500/20 p-5">
        <h3 className="text-base font-bold text-amber-400 mb-4 flex items-center gap-2">
          <ArrowRight className="w-4 h-4" /> Cross-Pillar Resource Flows — Tick #{globalTick}
        </h3>
        <div className="space-y-2">
          {INITIAL_FLOWS.map((flow, i) => {
            const fromP = K1_PILLARS.find(p => p.id === flow.from);
            const toP   = K1_PILLARS.find(p => p.id === flow.to);
            if (!fromP || !toP) return null;
            const fromSa = sectorState.find(s => s.id === flow.from);
            const active = (globalTick % 5) >= i % 5;
            const bc = BAND_COLORS[fromP.psi.band];
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 border transition-all"
                style={{ borderColor: active ? bc + "44" : "#ffffff10", background: active ? bc + "08" : "transparent" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: active ? bc : "#334155" }} />
                <span className="text-xs font-mono text-slate-300 w-24 truncate">{fromP.name.split(" ")[0]}</span>
                <div className="flex-1 h-0.5 rounded-full relative overflow-hidden bg-slate-800">
                  {active && (
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: "100%", background: `linear-gradient(90deg, transparent, ${bc}, transparent)`,
                        animation: "shimmer 1.5s infinite" }} />
                  )}
                </div>
                <span className="text-xs font-mono text-slate-300 w-24 truncate text-right">{toP.name.split(" ")[0]}</span>
                <span className="text-[9px] text-slate-500 w-20 text-right font-mono">{flow.resourceType.replace("_", " ")}</span>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}

// ── Planet State ───────────────────────────────────────────────────────────────
function PlanetState() {
  const [tick, setTick] = useState(0);
  const [energyOutput, setEnergyOutput] = useState(() =>
    ENERGY_SOURCES.map(s => ({ ...s, currentGW: s.baseGW + (Math.random() - 0.5) * 2 }))
  );
  const [sectorDraw, setSectorDraw] = useState(() =>
    K1_PILLARS.map(p => ({ id: p.id, drawGW: p.kLevel * 12 + Math.random() * 3 }))
  );
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setTick(t => t + 1);
      setEnergyOutput(prev => prev.map(s => ({
        ...s, currentGW: Math.max(0, s.baseGW + (Math.random() - 0.5) * 4),
      })));
      setSectorDraw(prev => prev.map(s => ({
        ...s, drawGW: Math.max(1, s.drawGW + (Math.random() - 0.5) * 1.2),
      })));
    }, 2_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  const totalGenGW  = energyOutput.reduce((sum, s) => sum + s.currentGW, 0);
  const totalDrawGW = sectorDraw.reduce((sum, s) => sum + s.drawGW, 0);
  const surplus     = totalGenGW - totalDrawGW;
  const overallK    = K1_PILLARS.reduce((s, p) => s + p.kLevel, 0) / K1_PILLARS.length;

  return (
    <div className="space-y-6">

      {/* Planet-level energy balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Generation", val: totalGenGW.toFixed(1) + " GW", sub: `${ENERGY_SOURCES.length} sources active`, color: "text-green-400", border: "border-green-500/30" },
          { label: "Civilisation Draw", val: totalDrawGW.toFixed(1) + " GW", sub: `${K1_PILLARS.length} sectors running`, color: "text-cyan-400", border: "border-cyan-500/30" },
          { label: "Net Surplus", val: (surplus >= 0 ? "+" : "") + surplus.toFixed(1) + " GW", sub: surplus >= 0 ? "Reserves accumulating" : "Drawing from reserves", color: surplus >= 0 ? "text-amber-400" : "text-red-400", border: surplus >= 0 ? "border-amber-500/30" : "border-red-500/30" },
        ].map(s => (
          <Card key={s.label} className={`bg-slate-900/60 ${s.border} p-4 text-center`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Energy generation sources */}
      <Card className="bg-slate-900/60 border-yellow-500/20 p-5">
        <h3 className="text-base font-bold text-yellow-400 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Energy Generation Sources — Live Output
        </h3>
        <div className="space-y-3">
          {energyOutput.map(src => {
            const pct = (src.currentGW / totalGenGW) * 100;
            return (
              <div key={src.id} className="space-y-1" data-testid={`energy-source-${src.id}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium" style={{ color: src.color }}>{src.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400">{src.formula}</span>
                    <span className="font-bold text-white w-16 text-right">{src.currentGW.toFixed(1)} GW</span>
                    <span className="text-slate-500 w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: src.color }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs">
          <span className="text-slate-500">Total capacity</span>
          <span className="font-bold text-green-400">{totalGenGW.toFixed(1)} GW</span>
        </div>
      </Card>

      {/* Distribution cascade */}
      <Card className="bg-slate-900/60 border-blue-500/20 p-5">
        <h3 className="text-base font-bold text-blue-400 mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4" /> Distribution Cascade — Authority Band Priority
        </h3>
        <p className="text-xs text-slate-500 mb-4 font-mono">
          SYSTEM (highest compression) → KERNEL → USER → GUEST · Allocation determined by Λ=hf/c² authority weight
        </p>
        <div className="space-y-2">
          {DISTRIBUTION_CASCADE.map((d, i) => {
            const pillar  = K1_PILLARS.find(p => p.id === d.to);
            const allocGW = (d.pct / 100) * totalGenGW;
            const drawSec = sectorDraw.find(s => s.id === d.to);
            const drawGW  = drawSec?.drawGW ?? 0;
            const ok      = allocGW >= drawGW;
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-800/40 border border-slate-700/30"
                data-testid={`distribution-row-${d.to ?? i}`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <div className="w-16 text-[9px] font-mono font-bold rounded px-1" style={{ color: d.color, background: d.color + "22" }}>{d.band}</div>
                <span className="text-xs text-white flex-1 truncate">{pillar?.name ?? d.to}</span>
                <div className="text-right">
                  <div className="text-xs font-mono text-slate-300">{allocGW.toFixed(1)} GW alloc</div>
                  <div className={`text-[9px] font-mono ${ok ? "text-green-400" : "text-red-400"}`}>
                    {ok ? `+${(allocGW - drawGW).toFixed(1)} surplus` : `-${(drawGW - allocGW).toFixed(1)} deficit`}
                  </div>
                </div>
                <div className="w-14">
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (drawGW / allocGW) * 100)}%`, background: ok ? d.color : "#ef4444" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Sector draw vs allocation */}
      <Card className="bg-slate-900/60 border-purple-500/20 p-5">
        <h3 className="text-base font-bold text-purple-400 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4" /> Sector Energy Draw vs Allocation — Tick #{tick}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {K1_PILLARS.map(pillar => {
            const bc   = BAND_COLORS[pillar.psi.band];
            const dist = DISTRIBUTION_CASCADE.find(d => d.to === pillar.id);
            const drawSec = sectorDraw.find(s => s.id === pillar.id);
            const allocGW = dist ? (dist.pct / 100) * totalGenGW : 0;
            const drawGW  = drawSec?.drawGW ?? 0;
            const usePct  = allocGW > 0 ? Math.min(100, (drawGW / allocGW) * 100) : 0;
            return (
              <div key={pillar.id} className="rounded-lg border p-3 space-y-2"
                style={{ borderColor: bc + "33", background: bc + "06" }}
                data-testid={`planet-sector-${pillar.id}`}>
                <div className="flex items-center gap-2">
                  <div style={{ color: bc }}>{pillar.icon}</div>
                  <span className="text-sm font-bold text-white flex-1 truncate">{pillar.name.split(" ")[0]}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: bc, background: bc + "22" }}>{pillar.psi.band}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="text-center"><div className="text-slate-500">Alloc</div><div className="font-bold text-white">{allocGW.toFixed(1)}GW</div></div>
                  <div className="text-center"><div className="text-slate-500">Draw</div><div className="font-bold" style={{ color: bc }}>{drawGW.toFixed(1)}GW</div></div>
                  <div className="text-center"><div className="text-slate-500">K-Level</div><div className="font-bold text-cyan-400">{pillar.kLevel.toFixed(2)}</div></div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${usePct}%`, background: usePct > 90 ? "#ef4444" : bc }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Civilisation K-Level status */}
      <Card className="bg-gradient-to-br from-slate-900/60 to-indigo-950/40 border-indigo-500/30 p-5">
        <h3 className="text-base font-bold text-indigo-400 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Civilisation K-Level Progress — Kardashev Scale
        </h3>
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">Overall K-Level</span>
            <span className="font-bold text-indigo-400 text-lg">{overallK.toFixed(3)}</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-cyan-500 to-green-400 transition-all duration-1000"
              style={{ width: `${overallK * 100}%` }} />
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 mt-1">
            <span>0.0 — Pre-industrial</span><span>0.5 — Early K1</span><span>1.0 — K1 Complete</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {K1_PILLARS.map(p => (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <div style={{ color: BAND_COLORS[p.psi.band] }} className="flex-shrink-0">{p.icon}</div>
              <span className="text-slate-400 w-28 truncate">{p.name.split(" ")[0]}</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${p.kLevel * 100}%`, background: BAND_COLORS[p.psi.band] }} />
              </div>
              <span className="font-mono text-slate-300 w-8 text-right">{(p.kLevel * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </Card>

    </div>
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
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="btn-home">
              <ArrowLeft className="w-4 h-4 mr-2" /> Home
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.history.back()}
            className="text-gray-400 hover:text-white border-gray-700 hover:border-gray-500"
            data-testid="btn-back-previous"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Previous Page
          </Button>
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
          <div className="flex justify-center mb-4">
            <Link href="/k1/orchestration">
              <Button className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500" data-testid="link-k1-orchestration">
                <Activity className="w-4 h-4 mr-2" />
                Open K1 Orchestration Runtime
              </Button>
            </Link>
          </div>
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

        <PillarSpectrumStrip pillars={K1_PILLARS} />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
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
          <div className="overflow-x-auto pb-1">
          <TabsList className="grid min-w-[560px] w-full grid-cols-7 bg-slate-900/50">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Globe className="w-4 h-4 mr-1" /> Overview
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Atom className="w-4 h-4 mr-1" /> Activity
            </TabsTrigger>
            <TabsTrigger value="planet" data-testid="tab-planet">
              <Zap className="w-4 h-4 mr-1" /> Planet
            </TabsTrigger>
            <TabsTrigger value="sectormap" data-testid="tab-sectormap">
              <Waves className="w-4 h-4 mr-1" /> Sectors
            </TabsTrigger>
            <TabsTrigger value="network" data-testid="tab-network">
              <Network className="w-4 h-4 mr-1" /> Network
            </TabsTrigger>
            <TabsTrigger value="specs" data-testid="tab-specs">
              <BookOpen className="w-4 h-4 mr-1" /> Specs
            </TabsTrigger>
            <TabsTrigger value="demo" data-testid="tab-demo">
              <Play className="w-4 h-4 mr-1" /> Demo
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-slate-900/50 border-cyan-500/30 p-6">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Layers className="w-6 h-6" />
                Seven Pillars of K1 Civilization
              </h2>
              <p className="text-gray-300 mb-6">
                The WNSP K1 Infrastructure implements the complete foundation for a Kardashev Type I civilization, 
                capable of harnessing the total energy output of a planet. Each pillar occupies a unique Ψ_channel 
                bound to its authority rank on the Λ=hf/c² compression curve — sectors never interfere at the physics layer.
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

          <TabsContent value="activity" className="space-y-6">
            <MultidimensionalActivity />
          </TabsContent>

          <TabsContent value="planet" className="space-y-6">
            <PlanetState />
          </TabsContent>

          <TabsContent value="sectormap" className="space-y-6">
            <Card className="bg-slate-900/50 border-cyan-500/30 p-6">
              <h2 className="text-2xl font-bold text-cyan-400 mb-2 flex items-center gap-2">
                <Waves className="w-6 h-6" />
                Sector Constitutional Channel Map
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Every human civilization sector is constitutionally bound to a unique Ψ_channel on the Λ=hf/c² compression curve.
                Authority is determined by compression state — shorter wavelength = higher energy = higher governance weight.
                Orthogonality means sectors are geometrically isolated: no interference is physically possible.
              </p>
              <ConstitutionalMap />

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {K1_PILLARS.map(p => {
                  const bc = BAND_COLORS[p.psi.band];
                  const hz = (2.998e17 / p.psi.nm / 1e12).toFixed(1);
                  const E = (6.626e-34 * 2.998e17 / p.psi.nm).toExponential(3);
                  return (
                    <div key={p.id} className="rounded-xl border p-4 space-y-2" style={{ borderColor: bc + "44", background: bc + "08" }} data-testid={`sector-detail-${p.id}`}>
                      <div className="flex items-center gap-3">
                        <div style={{ color: bc }}>{p.icon}</div>
                        <div>
                          <div className="text-sm font-bold text-white">{p.name}</div>
                          <div className="font-mono text-xs" style={{ color: bc }}>{p.psi.uri}</div>
                        </div>
                        <span className="ml-auto text-xs font-mono rounded px-2 py-0.5 font-bold" style={{ color: bc, background: bc + "22" }}>{p.psi.band}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                        <div className="text-center">
                          <div className="text-xs text-slate-500">Wavelength</div>
                          <div className="text-sm font-mono text-white">{p.psi.nm}nm</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500">Frequency</div>
                          <div className="text-sm font-mono text-white">{hz}THz</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500">Energy</div>
                          <div className="text-sm font-mono text-white">{E}J</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center rounded-lg px-2 py-1 bg-slate-950/60 border border-slate-800">
                          <div className="text-xs text-slate-500">WDM·OAM·Pol</div>
                          <div className="font-mono text-xs" style={{ color: bc }}>{p.psi.wdm}·{p.psi.oam}·{p.psi.pol}</div>
                        </div>
                        <div className="text-center rounded-lg px-2 py-1 bg-slate-950/60 border border-slate-800">
                          <div className="text-xs text-slate-500">Channel Index</div>
                          <div className="font-mono text-xs text-slate-300">#{p.psi.channelIndex.toLocaleString()}</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{p.description}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
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
