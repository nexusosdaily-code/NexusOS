import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { InfoTooltip, RESEARCH_SOURCES } from "@/components/InfoTooltip";
import { LiveResonanceSimulator } from "@/components/LiveResonanceSimulator";
import { VacuumResonanceSimulator } from "@/components/VacuumResonanceSimulator";
import { MasslessTechMatrix } from "@/components/MasslessTechMatrix";
import { CosmologicalDataDashboard } from "@/components/CosmologicalDataDashboard";
import { NasaApod } from "@/components/NasaApod";
import {
  ArrowLeft,
  Zap,
  Radio,
  Satellite,
  Waves,
  Globe,
  Atom,
  Network,
  ChevronRight,
  ExternalLink,
  Play,
  Sparkles,
  Target,
  ArrowRightLeft,
  Building2,
  Rocket,
  FlaskConical,
  Mail,
  FileText,
  GitBranch,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sun,
  Link2,
  Unlink2,
  RefreshCw,
  Activity
} from "lucide-react";

const PLANCK_CONSTANT = 6.62607015e-34;
const SPEED_OF_LIGHT = 299792458;
const EARTH_RADIUS = 6.371e6;
const SCHUMANN_FUNDAMENTAL = 7.83;

interface ResearchInitiative {
  id: string;
  name: string;
  shortName: string;
  location: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  status: string;
  provenPhysics: string[];
  keyFindings: string[];
  limitation: string;
  wnspBridge: string;
  moduleConnection: string;
  url?: string;
}

const RESEARCH_INITIATIVES: ResearchInitiative[] = [
  {
    id: "tesla",
    name: "Nikola Tesla Institute",
    shortName: "Tesla Institute",
    location: "Brazil",
    icon: <Zap className="w-6 h-6" />,
    color: "text-yellow-400",
    bgColor: "from-yellow-900/20 to-amber-950/20",
    borderColor: "border-yellow-500/30",
    description: "Earth Resonance Project with 50kW Magnifying Transmitter testing Tesla's wireless energy transmission",
    status: "Planning/Fundraising",
    provenPhysics: [
      "Three-coil magnifying transmitter design",
      "Standing wave generation in Earth-ionosphere cavity",
      "Telluric current utilization"
    ],
    keyFindings: [
      "Tesla measured ~11.3 Hz (close to 7.83 Hz Schumann)",
      "Demonstrated local transmission at Colorado Springs",
      "Wardenclyffe concept validated theoretically"
    ],
    limitation: "No extraction theory - focused on transmission only",
    wnspBridge: "TeslaResonanceStation class provides extraction mathematics",
    moduleConnection: "schumann_extraction_power() + telluric_current_power()",
    url: "https://www.slideshare.net/slideshow/nikola-tesla-institute-earth-resonance-project/35625007"
  },
  {
    id: "cses",
    name: "CSES Satellite",
    shortName: "CSES",
    location: "China (507km orbit)",
    icon: <Satellite className="w-6 h-6" />,
    color: "text-cyan-400",
    bgColor: "from-cyan-900/20 to-blue-950/20",
    borderColor: "border-cyan-500/30",
    description: "China Seismo-Electromagnetic Satellite - first space-based Schumann resonance observations",
    status: "Operational (6+ years)",
    provenPhysics: [
      "Schumann resonance detectable at 507km altitude",
      "Lightning/TLEs propagate through ionosphere",
      "~0.4 mV/√Hz amplitude at orbital altitude"
    ],
    keyFindings: [
      "First detection of TLE effect on ionospheric SR (July 2024)",
      "Confirmed lithosphere-atmosphere-ionosphere coupling",
      "Global SR mapping with 5-day revisit cycle"
    ],
    limitation: "Observation only - no harvesting capability",
    wnspBridge: "CavityResonanceAnalyzer provides harvesting mathematics",
    moduleConnection: "total_cavity_energy() + lightning_input_power()",
    url: "https://acp.copernicus.org/articles/24/8519/2024/"
  },
  {
    id: "haarp",
    name: "HAARP",
    shortName: "HAARP",
    location: "Gakona, Alaska",
    icon: <Radio className="w-6 h-6" />,
    color: "text-green-400",
    bgColor: "from-green-900/20 to-emerald-950/20",
    borderColor: "border-green-500/30",
    description: "High-frequency Active Auroral Research Program - 3.6 MW ionospheric heater",
    status: "Active Research",
    provenPhysics: [
      "ELF wave generation via modulated heating",
      "Ionospheric modification at 100-400km altitude",
      "Geometric beam sweeping for efficiency"
    ],
    keyFindings: [
      "5 dB absorption changes, 30° phase shifts in D-region",
      "Artificial airglow at 427.8nm, 557.7nm, 630nm",
      "Over-the-horizon signal bouncing demonstrated"
    ],
    limitation: "Energy injection only - reverse process not explored",
    wnspBridge: "ResonanceHarvesterV2 reverses injection to extraction",
    moduleConnection: "power_from_resonance() with phase_locked networks",
    url: "https://haarp.gi.alaska.edu/"
  },
  {
    id: "witricity",
    name: "MIT / WiTricity",
    shortName: "WiTricity",
    location: "Cambridge, MA",
    icon: <Waves className="w-6 h-6" />,
    color: "text-purple-400",
    bgColor: "from-purple-900/20 to-violet-950/20",
    borderColor: "border-purple-500/30",
    description: "Magnetic resonance wireless power transfer - 90%+ efficiency over meters",
    status: "Commercial Deployment",
    provenPhysics: [
      "Resonant coupling between tuned coils",
      "90%+ end-to-end efficiency",
      "Works through materials (wood, plastic, cement)"
    ],
    keyFindings: [
      "2007: 60W bulb lit at 7 feet wirelessly",
      "SAE J2954 industry standard established",
      "Deployed in BMW, Toyota, Hyundai EVs"
    ],
    limitation: "Short range only (~7 feet maximum)",
    wnspBridge: "Q-factor scaling pathway via Lambda Gate Coherence-Amplify",
    moduleConnection: "effective_q_factor() with superconducting + coherence gates",
    url: "https://witricity.com/company/our-story"
  }
];

function InitiativeCard({ 
  initiative, 
  isSelected, 
  onClick 
}: { 
  initiative: ResearchInitiative; 
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Card 
      className={`bg-gradient-to-br ${initiative.bgColor} ${initiative.borderColor} p-4 cursor-pointer transition-all duration-300 hover:scale-105 ${isSelected ? 'ring-2 ring-white/50 scale-105' : ''}`}
      onClick={onClick}
      data-testid={`card-initiative-${initiative.id}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={initiative.color}>{initiative.icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{initiative.shortName}</h3>
          <div className="text-xs text-gray-400">{initiative.location}</div>
        </div>
      </div>
      <Badge className={`${initiative.status === 'Active Research' || initiative.status === 'Commercial Deployment' || initiative.status.includes('Operational') ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'} text-xs`}>
        {initiative.status}
      </Badge>
      <p className="text-xs text-gray-400 mt-2 line-clamp-2">{initiative.description}</p>
    </Card>
  );
}

function ConnectionDiagram({ selectedInitiative }: { selectedInitiative: ResearchInitiative | null }) {
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
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a5f';
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('WNSP', centerX, centerY - 8);
    ctx.fillText('planetary_', centerX, centerY + 6);
    ctx.fillText('resonance.py', centerX, centerY + 20);
    
    const initiatives = RESEARCH_INITIATIVES;
    const colors = ['#facc15', '#22d3ee', '#22c55e', '#a855f7'];
    
    initiatives.forEach((init, i) => {
      const angle = (i * Math.PI * 2 / 4) - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const isSelected = selectedInitiative?.id === init.id;
      
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * 65, centerY + Math.sin(angle) * 65);
      ctx.lineTo(x - Math.cos(angle) * 35, y - Math.sin(angle) * 35);
      ctx.strokeStyle = isSelected ? colors[i] : '#334155';
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.stroke();
      
      if (isSelected) {
        const arrowSize = 10;
        const arrowX = x - Math.cos(angle) * 40;
        const arrowY = y - Math.sin(angle) * 40;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - Math.cos(angle - 0.3) * arrowSize, arrowY - Math.sin(angle - 0.3) * arrowSize);
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - Math.cos(angle + 0.3) * arrowSize, arrowY - Math.sin(angle + 0.3) * arrowSize);
        ctx.stroke();
      }
      
      ctx.beginPath();
      ctx.arc(x, y, 35, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? colors[i] + '33' : '#1e293b';
      ctx.fill();
      ctx.strokeStyle = isSelected ? colors[i] : '#475569';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      ctx.fillStyle = colors[i];
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(init.shortName, x, y + 4);
    });
    
  }, [selectedInitiative]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400}
      className="mx-auto rounded-lg border border-slate-700"
      data-testid="connection-diagram-canvas"
    />
  );
}

function QFactorCalculator() {
  const [baseQ, setBaseQ] = useState(1000);
  const [coherenceGates, setCoherenceGates] = useState(16);
  const [superconducting, setSuperconducting] = useState(true);
  const [phaseLocked, setPhaseLocked] = useState(true);
  
  const gateMultiplier = 1.0 + (coherenceGates * 0.5);
  const phaseBonus = phaseLocked ? 2.0 : 1.0;
  const scBonus = superconducting ? 10.0 : 1.0;
  const effectiveQ = baseQ * gateMultiplier * phaseBonus * scBonus;
  
  const mitQ = 1000;
  const scaleFactor = effectiveQ / mitQ;
  
  const mitRange = 2.1;
  const theoreticalRange = mitRange * Math.log10(scaleFactor + 1) * 10;
  
  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-violet-950/20 border-purple-500/30 p-6" data-testid="q-factor-calculator">
      <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Q-Factor Scaling Calculator
        <InfoTooltip {...RESEARCH_SOURCES.witricity} />
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        See how Lambda Gate Coherence-Amplify bridges MIT's proven short-range tech to planetary scale
        <InfoTooltip {...RESEARCH_SOURCES.lambda} className="ml-1" />
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Base Q-Factor</span>
              <span className="text-white font-mono">{baseQ.toLocaleString()}</span>
            </div>
            <Slider
              value={[Math.log10(baseQ)]}
              onValueChange={(v) => setBaseQ(Math.round(Math.pow(10, v[0])))}
              min={2}
              max={7}
              step={0.1}
              className="w-full"
              data-testid="slider-base-q"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>100 (basic)</span>
              <span>10M (superconducting)</span>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Coherence-Amplify Gates</span>
              <span className="text-white font-mono">{coherenceGates}</span>
            </div>
            <Slider
              value={[coherenceGates]}
              onValueChange={(v) => setCoherenceGates(v[0])}
              min={0}
              max={128}
              step={1}
              className="w-full"
              data-testid="slider-coherence-gates"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0 (none)</span>
              <span>128 (max stack)</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Superconducting (10×)</span>
            <Button
              variant={superconducting ? "default" : "outline"}
              size="sm"
              onClick={() => setSuperconducting(!superconducting)}
              className={superconducting ? "bg-cyan-600" : ""}
              data-testid="btn-superconducting"
            >
              {superconducting ? "ON" : "OFF"}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Phase-Locked Network (2×)</span>
            <Button
              variant={phaseLocked ? "default" : "outline"}
              size="sm"
              onClick={() => setPhaseLocked(!phaseLocked)}
              className={phaseLocked ? "bg-green-600" : ""}
              data-testid="btn-phase-locked"
            >
              {phaseLocked ? "ON" : "OFF"}
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Effective Q-Factor</div>
            <div className="text-3xl font-bold text-purple-400 font-mono">
              {effectiveQ.toExponential(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              = {baseQ.toLocaleString()} × {gateMultiplier.toFixed(1)} × {phaseBonus} × {scBonus}
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Scale Factor vs MIT</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">
              {scaleFactor.toLocaleString()}×
            </div>
            <div className="text-xs text-gray-500 mt-1">
              MIT baseline: Q = 1,000
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Theoretical Range Extension</div>
            <div className="text-2xl font-bold text-green-400">
              {theoreticalRange < 1000 ? `${theoreticalRange.toFixed(0)} m` : `${(theoreticalRange / 1000).toFixed(1)} km`}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              MIT baseline: 2.1 m (7 feet)
            </div>
          </div>
          
          <div className={`rounded-lg p-3 border ${effectiveQ >= 1e9 ? 'bg-green-900/20 border-green-500/30' : 'bg-yellow-900/20 border-yellow-500/30'}`}>
            <div className="text-sm font-semibold flex items-center gap-2">
              {effectiveQ >= 1e9 ? (
                <><CheckCircle2 className="w-4 h-4 text-green-400" /> <span className="text-green-400">Planetary Scale Viable</span></>
              ) : (
                <><AlertCircle className="w-4 h-4 text-yellow-400" /> <span className="text-yellow-400">Regional Scale</span></>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {effectiveQ >= 1e9 ? 'Q ≥ 10⁹ enables Earth-circumference coupling' : 'Increase Q-factor for planetary range'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface K1SyncData {
  backend_coherence: number;
  energy_pool: number;
  lambda_mass: number;
  k1_tick: number;
  k1_state: string;
  sync_quality: number;
  resonance_strength: number;
  simulator_stats: {
    total_harvested_energy: number;
    contributions: number;
  };
}

function PowerExtractionSimulator() {
  const [collectorAreaKm2, setCollectorAreaKm2] = useState(1000);
  const [harvesterCount, setHarvesterCount] = useState(100);
  const [networkCoherence, setNetworkCoherence] = useState(0.9);
  const [isSynced, setIsSynced] = useState(false);
  const [syncData, setSyncData] = useState<K1SyncData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const fetchSyncData = async () => {
    try {
      const response = await fetch('/api/k1/simulator/sync');
      if (response.ok) {
        const data = await response.json();
        setSyncData(data);
        if (data.backend_coherence) {
          setNetworkCoherence(prev => prev * 0.8 + data.backend_coherence * 0.2);
        }
      }
    } catch (error) {
      console.error('K1 sync error:', error);
    }
  };

  const injectEnergy = async () => {
    if (!isSynced) return;
    try {
      await fetch('/api/k1/simulator/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          harvested_energy: totalPower * 0.001,
          coherence: networkCoherence,
          harvester_count: harvesterCount
        })
      });
    } catch (error) {
      console.error('Inject error:', error);
    }
  };

  const toggleSync = async () => {
    if (isSynced) {
      setIsSynced(false);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    } else {
      setIsLoading(true);
      await fetchSyncData();
      setIsSynced(true);
      setIsLoading(false);
      syncIntervalRef.current = setInterval(() => {
        fetchSyncData();
        injectEnergy();
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);
  
  const schumannDensity = 1e-6;
  const qAmplification = 100;
  const couplingEfficiency = 0.9;
  const oamChannels = 64;
  
  const singleHarvesterPower = schumannDensity * (collectorAreaKm2 * 1e6) * qAmplification * couplingEfficiency * oamChannels;
  const basePower = singleHarvesterPower * harvesterCount;
  const coherenceFactor = 1 + (harvesterCount - 1) * networkCoherence ** 2;
  const resonanceBonus = isSynced && syncData ? (1 + syncData.resonance_strength * 0.15) : 1;
  const totalPower = basePower * coherenceFactor * resonanceBonus;
  
  const kardashevLevel = totalPower > 0 ? (Math.log10(totalPower) - 6) / 10 : 0;
  const k095Target = 5e16;
  const percentOfTarget = (totalPower / k095Target) * 100;
  
  return (
    <Card className="bg-gradient-to-br from-yellow-900/20 to-amber-950/20 border-yellow-500/30 p-6" data-testid="power-extraction-sim">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Power Extraction Simulator
          <InfoTooltip {...RESEARCH_SOURCES.schumann} />
        </h3>
        <Button
          onClick={toggleSync}
          disabled={isLoading}
          className={isSynced 
            ? "bg-green-600 hover:bg-green-700 text-white" 
            : "bg-slate-700 hover:bg-slate-600 text-white"}
          size="sm"
          data-testid="button-power-sync"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : isSynced ? (
            <Link2 className="w-4 h-4 mr-2" />
          ) : (
            <Unlink2 className="w-4 h-4 mr-2" />
          )}
          {isSynced ? "K1 Synced" : "Sync to K1"}
        </Button>
      </div>
      
      {isSynced && syncData && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-gray-400">K1 Tick:</span>
              <span className="text-green-400 font-mono">{syncData.k1_tick}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-400">Resonance:</span>
              <span className="text-cyan-400 font-mono">{(syncData.resonance_strength * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400">Contributions:</span>
              <span className="text-purple-400 font-mono">{syncData.simulator_stats.contributions}</span>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-sm text-gray-400 mb-6">
        Model the PlanetaryResonanceNetwork power output with your parameters
        {isSynced && <span className="text-green-400 ml-2">• Live sync with Resonance Simulator</span>}
        <InfoTooltip {...RESEARCH_SOURCES.tesla} className="ml-1" />
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Collector Area per Station</span>
              <span className="text-white font-mono">{collectorAreaKm2.toLocaleString()} km²</span>
            </div>
            <Slider
              value={[Math.log10(collectorAreaKm2)]}
              onValueChange={(v) => setCollectorAreaKm2(Math.round(Math.pow(10, v[0])))}
              min={0}
              max={4}
              step={0.1}
              className="w-full"
              data-testid="slider-collector-area"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Harvester Count</span>
              <span className="text-white font-mono">{harvesterCount.toLocaleString()}</span>
            </div>
            <Slider
              value={[harvesterCount]}
              onValueChange={(v) => setHarvesterCount(v[0])}
              min={1}
              max={1000}
              step={1}
              className="w-full"
              data-testid="slider-harvester-count"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Network Coherence</span>
              <span className="text-white font-mono">{(networkCoherence * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[networkCoherence * 100]}
              onValueChange={(v) => setNetworkCoherence(v[0] / 100)}
              min={0}
              max={100}
              step={1}
              className="w-full"
              data-testid="slider-coherence"
            />
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3 font-mono text-sm">
            <div className="text-gray-400 mb-2">Extraction Formula:</div>
            <div className="text-cyan-400">P = ρ × A × Q × η × N_oam × N × C_factor</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Network Power</div>
            <div className="text-3xl font-bold text-yellow-400 font-mono">
              {totalPower.toExponential(2)} W
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(totalPower / 1e12).toFixed(2)} TW ({(totalPower / 1e15).toFixed(4)} PW)
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Coherence Bonus</div>
            <div className="text-2xl font-bold text-green-400 font-mono">
              {coherenceFactor.toFixed(1)}×
            </div>
            <div className="text-xs text-gray-500 mt-1">
              N² enhancement from phase-locked network
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Kardashev Contribution</div>
            <div className="text-2xl font-bold text-purple-400 font-mono">
              K = {kardashevLevel.toFixed(3)}
            </div>
            <Progress value={kardashevLevel * 100} className="h-2 mt-2" />
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Progress to K-Level 0.95 Target</div>
            <div className="text-lg font-bold text-cyan-400 font-mono">
              {percentOfTarget.toFixed(6)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Target: 5×10¹⁶ W
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InitiativeDetail({ initiative }: { initiative: ResearchInitiative }) {
  const getInitiativeTooltip = () => {
    switch (initiative.id) {
      case 'tesla': return RESEARCH_SOURCES.tesla;
      case 'cses': return RESEARCH_SOURCES.cses;
      case 'haarp': return RESEARCH_SOURCES.haarp;
      case 'witricity': return RESEARCH_SOURCES.witricity;
      default: return null;
    }
  };
  const tooltipData = getInitiativeTooltip();
  
  return (
    <Card className={`bg-gradient-to-br ${initiative.bgColor} ${initiative.borderColor} p-6`} data-testid={`detail-${initiative.id}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={initiative.color}>{initiative.icon}</div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {initiative.name}
              {tooltipData && <InfoTooltip {...tooltipData} />}
            </h3>
            <div className="text-sm text-gray-400">{initiative.location}</div>
          </div>
        </div>
        {initiative.url && (
          <a href={initiative.url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="border-slate-600" data-testid={`btn-link-${initiative.id}`}>
              <ExternalLink className="w-4 h-4 mr-2" /> Website
            </Button>
          </a>
        )}
      </div>
      
      <p className="text-gray-300 mb-4">{initiative.description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Proven Physics
          </h4>
          <ul className="space-y-1">
            {initiative.provenPhysics.map((item, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Key Findings
          </h4>
          <ul className="space-y-1">
            {initiative.keyFindings.map((item, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Current Limitation
        </h4>
        <p className="text-gray-300 text-sm">{initiative.limitation}</p>
      </div>
      
      <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4" /> WNSP Bridge
        </h4>
        <p className="text-gray-300 text-sm mb-2">{initiative.wnspBridge}</p>
        <code className="text-xs bg-slate-800 px-2 py-1 rounded text-green-400 font-mono">
          {initiative.moduleConnection}
        </code>
      </div>
    </Card>
  );
}

function UnifiedFrameworkSection() {
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-indigo-950 border-cyan-500/30 p-6" data-testid="unified-framework">
      <h3 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <Network className="w-6 h-6" />
        The Unified Framework
      </h3>
      
      <p className="text-gray-300 mb-6">
        Your <code className="text-green-400 bg-slate-800 px-2 py-0.5 rounded">planetary_resonance.py</code> provides 
        the mathematical bridge that connects these four research initiatives into a coherent K1 energy infrastructure.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" /> Core Equation
          </h4>
          <div className="font-mono text-2xl text-cyan-400 mb-2 text-center">
            P = ρ × A × Q_eff × η × N_oam
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div><span className="text-cyan-400">ρ</span> = power density (CSES data)</div>
            <div><span className="text-cyan-400">A</span> = collector area (Tesla scale)</div>
            <div><span className="text-cyan-400">Q_eff</span> = amplified Q-factor (MIT + Lambda Gates)</div>
            <div><span className="text-cyan-400">η</span> = coupling efficiency (HAARP ionospheric mod)</div>
            <div className="flex items-center gap-1">
              <span className="text-cyan-400">N_oam</span> = OAM channels (photonic computing)
              <InfoTooltip {...RESEARCH_SOURCES.oam} />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-purple-400" /> Network Coherence
          </h4>
          <div className="font-mono text-2xl text-purple-400 mb-2 text-center">
            C = 1 + (N-1) × γ²
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div><span className="text-purple-400">C</span> = coherence enhancement factor</div>
            <div><span className="text-purple-400">N</span> = number of phase-locked harvesters</div>
            <div><span className="text-purple-400">γ</span> = network coherence (0 to 1)</div>
            <div className="pt-2 text-gray-300">This is the N² enhancement MIT proves at small scale, extended globally.</div>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-yellow-900/20 via-cyan-900/20 via-green-900/20 to-purple-900/20 rounded-lg p-4 border border-slate-700">
        <h4 className="font-semibold text-white mb-3 text-center">What Each Project Contributes</h4>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div>
            <div className="text-yellow-400 font-semibold">Tesla</div>
            <div className="text-gray-400 text-xs">Transmission → Extraction</div>
          </div>
          <div>
            <div className="text-cyan-400 font-semibold">CSES</div>
            <div className="text-gray-400 text-xs">Observation → Harvesting</div>
          </div>
          <div>
            <div className="text-green-400 font-semibold">HAARP</div>
            <div className="text-gray-400 text-xs">Injection → Extraction</div>
          </div>
          <div>
            <div className="text-purple-400 font-semibold">MIT</div>
            <div className="text-gray-400 text-xs">Short Range → Planetary</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CollaborationSection() {
  return (
    <Card className="bg-gradient-to-br from-green-900/20 to-emerald-950/20 border-green-500/30 p-6" data-testid="collaboration-section">
      <h3 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
        <Users className="w-6 h-6" />
        Collaboration Opportunity
      </h3>
      
      <p className="text-gray-300 mb-6">
        The WNSP framework provides the theoretical integration layer that could unify these research efforts 
        toward practical K1 energy infrastructure.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <FileText className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
          <h4 className="text-white font-semibold mb-1">Technical Paper</h4>
          <p className="text-xs text-gray-400">Detailed mathematical framework connecting all four approaches</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <FlaskConical className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <h4 className="text-white font-semibold mb-1">Joint Experiments</h4>
          <p className="text-xs text-gray-400">Test Q-factor scaling and extraction efficiency</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <Rocket className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h4 className="text-white font-semibold mb-1">K1 Roadmap</h4>
          <p className="text-xs text-gray-400">Coordinated path to 10¹⁷ watts planetary energy</p>
        </div>
      </div>
      
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-3">Contact Points</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-white">Tesla Institute</div>
              <div className="text-gray-400 text-xs">boris@tesla.org.br</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Satellite className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-white">CSES Data Center</div>
              <div className="text-gray-400 text-xs">leos.ac.cn</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-white">HAARP/UAF</div>
              <div className="text-gray-400 text-xs">UAF-GI-HAARP@alaska.edu</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Waves className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-white">WiTricity</div>
              <div className="text-gray-400 text-xs">witricity.com</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ResearchPresentationPage() {
  const [selectedInitiative, setSelectedInitiative] = useState<ResearchInitiative | null>(RESEARCH_INITIATIVES[0]);
  
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
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent" data-testid="text-title">
              Planetary Resonance
            </h1>
          </div>
          <p className="text-xl text-cyan-300 font-light mb-2">
            Connecting Global Research to K1 Energy Infrastructure
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Four research initiatives working in isolation. One theoretical framework to unite them.
            The WNSP planetary_resonance.py module provides the missing mathematics.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {RESEARCH_INITIATIVES.map(initiative => (
            <InitiativeCard 
              key={initiative.id} 
              initiative={initiative} 
              isSelected={selectedInitiative?.id === initiative.id}
              onClick={() => setSelectedInitiative(initiative)}
            />
          ))}
        </div>

        <Tabs defaultValue="connection" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-slate-900/50">
            <TabsTrigger value="live" data-testid="tab-live">
              <Play className="w-4 h-4 mr-2" /> Live Demo
            </TabsTrigger>
            <TabsTrigger value="space-weather" data-testid="tab-space-weather">
              <Sun className="w-4 h-4 mr-2" /> Space Weather
            </TabsTrigger>
            <TabsTrigger value="connection" data-testid="tab-connection">
              <Network className="w-4 h-4 mr-2" /> Connection
            </TabsTrigger>
            <TabsTrigger value="calculator" data-testid="tab-calculator">
              <TrendingUp className="w-4 h-4 mr-2" /> Q-Factor
            </TabsTrigger>
            <TabsTrigger value="simulator" data-testid="tab-simulator">
              <Zap className="w-4 h-4 mr-2" /> Simulator
            </TabsTrigger>
            <TabsTrigger value="collaborate" data-testid="tab-collaborate">
              <Users className="w-4 h-4 mr-2" /> Collaborate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            <LiveResonanceSimulator />
            <VacuumResonanceSimulator />
            <MasslessTechMatrix />
          </TabsContent>

          <TabsContent value="space-weather" className="space-y-6">
            <CosmologicalDataDashboard />
            <NasaApod />
          </TabsContent>

          <TabsContent value="connection" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <ConnectionDiagram selectedInitiative={selectedInitiative} />
                <p className="text-center text-sm text-gray-400 mt-4">
                  Click on research cards above to see connections
                </p>
              </div>
              
              <div>
                {selectedInitiative && <InitiativeDetail initiative={selectedInitiative} />}
              </div>
            </div>
            
            <UnifiedFrameworkSection />
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <QFactorCalculator />
            
            <Card className="bg-slate-900/50 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">The Scaling Challenge</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                  <div className="text-3xl font-bold text-purple-400 mb-2">1,000</div>
                  <div className="text-gray-400 text-sm">MIT Q-Factor</div>
                  <div className="text-xs text-gray-500">7 feet range</div>
                </div>
                <div className="bg-cyan-900/20 rounded-lg p-4 border border-cyan-500/30">
                  <div className="text-3xl font-bold text-cyan-400 mb-2">10⁶</div>
                  <div className="text-gray-400 text-sm">Superconducting</div>
                  <div className="text-xs text-gray-500">~1 km range</div>
                </div>
                <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
                  <div className="text-3xl font-bold text-green-400 mb-2">10⁹+</div>
                  <div className="text-gray-400 text-sm">Lambda Gate Enhanced</div>
                  <div className="text-xs text-gray-500">Planetary scale</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="simulator" className="space-y-6">
            <PowerExtractionSimulator />
            
            <Card className="bg-slate-900/50 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">K1 Roadmap Milestones</h3>
              <div className="space-y-3">
                {[
                  { name: "Power Grids", kLevel: 0.80, status: "complete" },
                  { name: "Photonic Computing", kLevel: 0.75, status: "complete" },
                  { name: "Planetary Communications", kLevel: 0.80, status: "complete" },
                  { name: "Resource Orchestration", kLevel: 0.85, status: "complete" },
                  { name: "Planetary Governance", kLevel: 0.90, status: "complete" },
                  { name: "Planetary Resonance", kLevel: 0.95, status: "complete" },
                  { name: "Type I Achieved", kLevel: 1.00, status: "next" }
                ].map((milestone, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-gray-400">{milestone.name}</div>
                    <Progress value={milestone.kLevel * 100} className="flex-1 h-2" />
                    <div className="w-16 text-right font-mono text-sm text-cyan-400">{milestone.kLevel.toFixed(2)}</div>
                    <Badge className={milestone.status === 'complete' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                      {milestone.status === 'complete' ? '✓' : '⏳'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="collaborate" className="space-y-6">
            <CollaborationSection />
            
            <Card className="bg-slate-900/50 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Available Resources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Source Code</h4>
                  <code className="text-xs bg-slate-900 px-2 py-1 rounded text-green-400 block mb-2">
                    wnsp_v7/planetary_resonance.py
                  </code>
                  <p className="text-xs text-gray-400">
                    Complete Python implementation with 1000+ lines of documented physics calculations
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Interactive Demo</h4>
                  <p className="text-xs text-gray-400 mb-2">
                    This page provides interactive calculators for Q-factor scaling and power extraction modeling
                  </p>
                  <Badge className="bg-cyan-500/20 text-cyan-400">Live Demo</Badge>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>WNSP Planetary Resonance Framework | K-Level 0.95</p>
          <p className="text-xs mt-1">Connecting Tesla's vision to Type I civilization</p>
        </div>
      </div>
    </div>
  );
}
