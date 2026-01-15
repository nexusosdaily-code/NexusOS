import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Droplets,
  Waves,
  Target,
  Activity,
  Zap,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  GitBranch,
  ArrowDown,
  ArrowUp,
  Filter
} from "lucide-react";

const CZC_CONSTANTS = {
  baseCoherence: 0.9999,
  iterations: 44,
  goldenAngle: 137.5,
  firstOscillation: 555e12,
  impedance: 376.730313668,
  phi: 1.618033988749895,
  planck: 6.62607015e-34,
  c: 299792458,
};

interface CatchBasinState {
  level: number;
  coherence: number;
  iterations: number;
  flowRate: number;
  pressure: number;
  temperature: number;
  entropy: number;
  stability: "stable" | "transitioning" | "unstable";
}

interface CorrectionEvent {
  id: number;
  iteration: number;
  type: "phase" | "amplitude" | "frequency" | "impedance";
  magnitude: number;
  coherenceBefore: number;
  coherenceAfter: number;
  timestamp: number;
}

interface BasinApplication {
  id: string;
  name: string;
  description: string;
  requiredCoherence: number;
  currentBinding: number;
  status: "bound" | "unbound" | "pending";
  category: "energy" | "computing" | "communication" | "gravitational";
}

const BASIN_APPLICATIONS: BasinApplication[] = [
  {
    id: "vacuum-extraction",
    name: "Vacuum Energy Extraction",
    description: "Cold zero-point energy harvesting from 555 THz oscillations",
    requiredCoherence: 0.95,
    currentBinding: 0,
    status: "unbound",
    category: "energy",
  },
  {
    id: "photonic-logic",
    name: "Photonic Logic Gates",
    description: "Coherent light-based computation at speed of light",
    requiredCoherence: 0.90,
    currentBinding: 0,
    status: "unbound",
    category: "computing",
  },
  {
    id: "spectral-relay",
    name: "Spectral Relay Mesh",
    description: "Phase-locked optical communication channels",
    requiredCoherence: 0.85,
    currentBinding: 0,
    status: "unbound",
    category: "communication",
  },
  {
    id: "gravity-decorrelation",
    name: "Gravity De-correlation",
    description: "ZERO-G envelope via phase quadrature alignment",
    requiredCoherence: 0.99,
    currentBinding: 0,
    status: "unbound",
    category: "gravitational",
  },
  {
    id: "oam-qubits",
    name: "OAM Qubit Registers",
    description: "Orbital angular momentum quantum information storage",
    requiredCoherence: 0.92,
    currentBinding: 0,
    status: "unbound",
    category: "computing",
  },
  {
    id: "lambda-substrate",
    name: "Lambda Computing Substrate",
    description: "8-gate photonic universal computation layer",
    requiredCoherence: 0.88,
    currentBinding: 0,
    status: "unbound",
    category: "computing",
  },
];

export function CZCCatchBasin() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  const [isRunning, setIsRunning] = useState(false);
  const [basinState, setBasinState] = useState<CatchBasinState>({
    level: 0,
    coherence: 0,
    iterations: 0,
    flowRate: 0,
    pressure: 0,
    temperature: 293.15,
    entropy: 1.0,
    stability: "unstable",
  });
  
  const [correctionEvents, setCorrectionEvents] = useState<CorrectionEvent[]>([]);
  const [applications, setApplications] = useState<BasinApplication[]>(BASIN_APPLICATIONS);
  const [inputRate, setInputRate] = useState(1.0);
  const [filterStrength, setFilterStrength] = useState(0.9999);
  const [autoCorrect, setAutoCorrect] = useState(true);
  const [k1SyncEnabled, setK1SyncEnabled] = useState(false);

  const calculateCZC = useCallback((iterations: number, filterStrength: number): number => {
    return Math.pow(filterStrength, iterations);
  }, []);

  const calculateEntropy = useCallback((coherence: number): number => {
    if (coherence <= 0 || coherence >= 1) return coherence <= 0 ? 1 : 0;
    return -coherence * Math.log2(coherence) - (1 - coherence) * Math.log2(1 - coherence);
  }, []);

  const performCorrection = useCallback((type: CorrectionEvent["type"]): CorrectionEvent => {
    const coherenceBefore = basinState.coherence;
    const magnitude = Math.random() * 0.001 + 0.0001;
    const coherenceAfter = Math.min(1, coherenceBefore + magnitude * (1 - coherenceBefore));
    
    return {
      id: Date.now(),
      iteration: basinState.iterations + 1,
      type,
      magnitude,
      coherenceBefore,
      coherenceAfter,
      timestamp: Date.now(),
    };
  }, [basinState]);

  const runIteration = useCallback(() => {
    let newCoherence = 0;
    
    setBasinState(prev => {
      const newIterations = prev.iterations + 1;
      const baseCoherence = calculateCZC(newIterations, filterStrength);
      
      const phaseNoise = (Math.random() - 0.5) * 0.001;
      const amplitudeNoise = (Math.random() - 0.5) * 0.0005;
      let coherence = baseCoherence + phaseNoise + amplitudeNoise;
      
      if (autoCorrect && coherence < baseCoherence) {
        const correctionTypes: CorrectionEvent["type"][] = ["phase", "amplitude", "frequency", "impedance"];
        const type = correctionTypes[Math.floor(Math.random() * correctionTypes.length)];
        const magnitude = Math.random() * 0.001 + 0.0001;
        const coherenceBefore = coherence;
        coherence = Math.min(1, coherence + magnitude * (1 - coherence));
        
        const event: CorrectionEvent = {
          id: Date.now(),
          iteration: newIterations,
          type,
          magnitude,
          coherenceBefore,
          coherenceAfter: coherence,
          timestamp: Date.now(),
        };
        setCorrectionEvents(events => [...events.slice(-43), event]);
      }
      
      coherence = Math.max(0, Math.min(1, coherence));
      newCoherence = coherence;
      
      const level = Math.min(100, prev.level + inputRate * (1 - prev.level / 100));
      const flowRate = inputRate * coherence;
      const pressure = level * coherence * 1.5;
      const entropy = calculateEntropy(coherence);
      
      let stability: CatchBasinState["stability"] = "unstable";
      if (coherence > 0.99) stability = "stable";
      else if (coherence > 0.9) stability = "transitioning";
      
      return {
        level,
        coherence,
        iterations: newIterations,
        flowRate,
        pressure,
        temperature: 293.15 - (coherence * 20),
        entropy,
        stability,
      };
    });

    setTimeout(() => {
      setApplications(apps => apps.map(app => {
        const currentCoherence = newCoherence;
        const binding = currentCoherence >= app.requiredCoherence 
          ? Math.min(100, app.currentBinding + 5)
          : Math.max(0, app.currentBinding - 2);
        
        let status: BasinApplication["status"] = "unbound";
        if (binding >= 100) status = "bound";
        else if (binding > 0) status = "pending";
        
        return { ...app, currentBinding: binding, status };
      }));
    }, 0);
  }, [inputRate, filterStrength, autoCorrect, calculateCZC, calculateEntropy]);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(runIteration, 100);
      return () => clearInterval(interval);
    }
  }, [isRunning, runIteration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width / 2
      );
      gradient.addColorStop(0, `rgba(139, 92, 246, ${0.1 + basinState.coherence * 0.3})`);
      gradient.addColorStop(0.5, `rgba(59, 130, 246, ${0.05 + basinState.coherence * 0.2})`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      const basinY = height * 0.3;
      const basinHeight = height * 0.5;
      const basinWidth = width * 0.6;
      const basinX = (width - basinWidth) / 2;
      
      ctx.beginPath();
      ctx.moveTo(basinX, basinY);
      ctx.bezierCurveTo(
        basinX - 20, basinY + basinHeight * 0.5,
        basinX - 20, basinY + basinHeight,
        width / 2, basinY + basinHeight + 20
      );
      ctx.bezierCurveTo(
        basinX + basinWidth + 20, basinY + basinHeight,
        basinX + basinWidth + 20, basinY + basinHeight * 0.5,
        basinX + basinWidth, basinY
      );
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.5 + basinState.coherence * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      const waterLevel = basinState.level / 100;
      const waterY = basinY + basinHeight * (1 - waterLevel);
      
      const waterGradient = ctx.createLinearGradient(0, waterY, 0, basinY + basinHeight);
      const hue = 200 + basinState.coherence * 80;
      waterGradient.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.7)`);
      waterGradient.addColorStop(1, `hsla(${hue}, 80%, 40%, 0.9)`);
      
      ctx.beginPath();
      ctx.moveTo(basinX + 10, waterY);
      
      const waveAmplitude = 5 * (1 - basinState.coherence);
      const waveFreq = 0.05;
      const time = Date.now() / 500;
      
      for (let x = basinX + 10; x <= basinX + basinWidth - 10; x += 2) {
        const y = waterY + Math.sin((x + time * 50) * waveFreq) * waveAmplitude;
        ctx.lineTo(x, y);
      }
      
      ctx.bezierCurveTo(
        basinX + basinWidth + 15, basinY + basinHeight,
        basinX + basinWidth + 15, basinY + basinHeight,
        width / 2, basinY + basinHeight + 15
      );
      ctx.bezierCurveTo(
        basinX - 15, basinY + basinHeight,
        basinX - 15, basinY + basinHeight,
        basinX + 10, waterY
      );
      
      ctx.fillStyle = waterGradient;
      ctx.fill();
      
      const numRings = 5;
      for (let i = 0; i < numRings; i++) {
        const ringProgress = ((time + i / numRings) % 1);
        const ringRadius = ringProgress * basinWidth * 0.4;
        const ringOpacity = (1 - ringProgress) * basinState.coherence * 0.5;
        
        ctx.beginPath();
        ctx.arc(width / 2, basinY + basinHeight * 0.6, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139, 92, 246, ${ringOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      if (isRunning) {
        const dropX = width / 2 + (Math.random() - 0.5) * 40;
        const dropY = basinY - 30 + (time * 100 % 50);
        const dropSize = 3 + inputRate * 2;
        
        ctx.beginPath();
        ctx.arc(dropX, dropY, dropSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.7})`;
        ctx.fill();
      }
      
      const numParticles = Math.floor(basinState.coherence * 20);
      for (let i = 0; i < numParticles; i++) {
        const angle = (time * 0.5 + i * CZC_CONSTANTS.goldenAngle * Math.PI / 180) % (Math.PI * 2);
        const radius = 20 + i * 3;
        const px = width / 2 + Math.cos(angle) * radius;
        const py = basinY + basinHeight * 0.5 + Math.sin(angle) * radius * 0.3;
        
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 179, 8, ${0.3 + basinState.coherence * 0.5})`;
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [basinState, isRunning, inputRate]);

  const syncToK1 = async () => {
    try {
      await apiRequest("POST", "/api/czc/sync", {
        source: "czc-catch-basin",
        coherence: basinState.coherence,
        iterations: basinState.iterations,
        stability: basinState.stability,
      });
      toast({
        title: "K1 Sync Active",
        description: `CZC Catch Basin synced at ${(basinState.coherence * 100).toFixed(2)}% coherence`,
      });
      setK1SyncEnabled(true);
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "Failed to sync with K1 Orchestration",
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setIsRunning(false);
    setBasinState({
      level: 0,
      coherence: 0,
      iterations: 0,
      flowRate: 0,
      pressure: 0,
      temperature: 293.15,
      entropy: 1.0,
      stability: "unstable",
    });
    setCorrectionEvents([]);
    setApplications(BASIN_APPLICATIONS);
    setK1SyncEnabled(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "energy": return <Zap className="w-4 h-4" />;
      case "computing": return <Layers className="w-4 h-4" />;
      case "communication": return <Waves className="w-4 h-4" />;
      case "gravitational": return <Target className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const finalCZC = calculateCZC(44, CZC_CONSTANTS.baseCoherence);

  return (
    <div className="space-y-6" data-testid="czc-catch-basin">
      <Card className="bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Droplets className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                CZC Catch Basin
              </span>
              <p className="text-sm text-gray-400 font-normal mt-1">
                Coherence Zenith Coefficient | 44 Evolutionary Self-Corrections
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge className={`${
                basinState.stability === "stable" 
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : basinState.stability === "transitioning"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              }`}>
                {basinState.stability === "stable" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {basinState.stability === "transitioning" && <RefreshCw className="w-3 h-3 mr-1" />}
                {basinState.stability === "unstable" && <AlertTriangle className="w-3 h-3 mr-1" />}
                {basinState.stability.toUpperCase()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-black/40 rounded-lg border border-blue-500/20">
              <div className="text-xs text-gray-500 mb-1">CZC⁴⁴ Target</div>
              <div className="font-mono text-blue-400 text-lg">{(finalCZC * 100).toFixed(4)}%</div>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-purple-500/20">
              <div className="text-xs text-gray-500 mb-1">Current Coherence</div>
              <div className="font-mono text-purple-400 text-lg">{(basinState.coherence * 100).toFixed(4)}%</div>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-cyan-500/20">
              <div className="text-xs text-gray-500 mb-1">Iterations</div>
              <div className="font-mono text-cyan-400 text-lg">{basinState.iterations} / 44</div>
            </div>
            <div className="p-4 bg-black/40 rounded-lg border border-amber-500/20">
              <div className="text-xs text-gray-500 mb-1">Entropy</div>
              <div className="font-mono text-amber-400 text-lg">{basinState.entropy.toFixed(4)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative">
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={300}
                className="w-full h-64 rounded-lg bg-black/60 border border-gray-700"
              />
              <div className="absolute top-2 left-2 text-xs text-gray-500">
                Basin Level: {basinState.level.toFixed(1)}%
              </div>
              <div className="absolute top-2 right-2 text-xs text-gray-500">
                Flow: {basinState.flowRate.toFixed(3)} L/s
              </div>
              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-blue-400">
                  <ArrowDown className="w-3 h-3" /> Input
                </div>
                <div className="flex items-center gap-1 text-xs text-purple-400">
                  <Filter className="w-3 h-3" /> Filter
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <ArrowUp className="w-3 h-3" /> Coherence
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setIsRunning(!isRunning)}
                  className={isRunning ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}
                  data-testid="basin-toggle"
                >
                  {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isRunning ? "Pause" : "Start"}
                </Button>
                <Button variant="outline" onClick={reset} data-testid="basin-reset">
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset
                </Button>
                <Button 
                  variant="outline" 
                  onClick={syncToK1}
                  className={k1SyncEnabled ? "border-green-500 text-green-400" : ""}
                  data-testid="basin-k1-sync"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${k1SyncEnabled ? "animate-spin" : ""}`} />
                  K1 Sync
                </Button>
              </div>

              <div>
                <Label className="text-gray-400 text-sm">Input Rate (coherence inflow)</Label>
                <Slider
                  value={[inputRate]}
                  onValueChange={(v) => setInputRate(v[0])}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="mt-2"
                  data-testid="input-rate-slider"
                />
                <div className="text-right text-sm font-mono text-blue-400 mt-1">
                  {inputRate.toFixed(1)}x
                </div>
              </div>

              <div>
                <Label className="text-gray-400 text-sm">Filter Strength (CZC base)</Label>
                <Slider
                  value={[filterStrength]}
                  onValueChange={(v) => setFilterStrength(v[0])}
                  min={0.99}
                  max={0.99999}
                  step={0.00001}
                  className="mt-2"
                  data-testid="filter-strength-slider"
                />
                <div className="text-right text-sm font-mono text-purple-400 mt-1">
                  {filterStrength.toFixed(5)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={autoCorrect}
                    onCheckedChange={setAutoCorrect}
                    data-testid="auto-correct-toggle"
                  />
                  <Label className="text-gray-400">Auto Self-Correction</Label>
                </div>
                <Badge className="bg-gray-700 text-gray-300">
                  {correctionEvents.length} corrections
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-gray-800/50 rounded">
                  <div className="text-xs text-gray-500">Pressure</div>
                  <div className="font-mono text-cyan-400">{basinState.pressure.toFixed(2)} Pa</div>
                </div>
                <div className="p-2 bg-gray-800/50 rounded">
                  <div className="text-xs text-gray-500">Temperature</div>
                  <div className="font-mono text-amber-400">{basinState.temperature.toFixed(2)} K</div>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="applications" className="mt-6">
            <TabsList className="bg-gray-800/50" data-testid="czc-tabs-list">
              <TabsTrigger value="applications" className="data-[state=active]:bg-blue-600" data-testid="tab-applications">
                <GitBranch className="w-4 h-4 mr-2" /> Applications
              </TabsTrigger>
              <TabsTrigger value="corrections" className="data-[state=active]:bg-purple-600" data-testid="tab-corrections">
                <Activity className="w-4 h-4 mr-2" /> Corrections
              </TabsTrigger>
              <TabsTrigger value="theory" className="data-[state=active]:bg-amber-600" data-testid="tab-theory">
                <TrendingUp className="w-4 h-4 mr-2" /> Theory
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applications.map((app) => (
                  <Card 
                    key={app.id}
                    className={`bg-black/40 border transition-all ${
                      app.status === "bound" 
                        ? "border-green-500/50 shadow-green-500/20 shadow-lg"
                        : app.status === "pending"
                        ? "border-amber-500/30"
                        : "border-gray-700"
                    }`}
                    data-testid={`app-card-${app.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`${
                          app.category === "energy" ? "bg-yellow-500/20 text-yellow-400" :
                          app.category === "computing" ? "bg-blue-500/20 text-blue-400" :
                          app.category === "communication" ? "bg-cyan-500/20 text-cyan-400" :
                          "bg-purple-500/20 text-purple-400"
                        }`}>
                          {getCategoryIcon(app.category)}
                          <span className="ml-1 capitalize">{app.category}</span>
                        </Badge>
                        {app.status === "bound" && (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <h4 className="font-semibold text-white mb-1">{app.name}</h4>
                      <p className="text-xs text-gray-400 mb-3">{app.description}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Required Coherence</span>
                          <span className="text-cyan-400">{(app.requiredCoherence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Binding Progress</span>
                          <span className={app.status === "bound" ? "text-green-400" : "text-amber-400"}>
                            {app.currentBinding.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={app.currentBinding} className="h-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="corrections" className="mt-4">
              <div className="bg-black/40 rounded-lg border border-gray-700 p-4 max-h-64 overflow-y-auto">
                {correctionEvents.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No corrections yet. Start the basin to see self-corrections.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {correctionEvents.slice().reverse().map((event) => (
                      <div 
                        key={event.id}
                        className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                            #{event.iteration}
                          </Badge>
                          <span className="text-gray-400 capitalize">{event.type}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-red-400 font-mono text-xs">
                            {(event.coherenceBefore * 100).toFixed(4)}%
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className="text-green-400 font-mono text-xs">
                            {(event.coherenceAfter * 100).toFixed(4)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="theory" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-black/40 border-gray-700">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-purple-400 mb-3">CZC Catch Basin Mechanics</h4>
                    <p className="text-sm text-gray-300 mb-4">
                      The Catch Basin accumulates coherence through iterative filtering. Each pass 
                      through the CZC filter removes noise while preserving signal integrity.
                    </p>
                    <div className="p-3 bg-gray-900/50 rounded font-mono text-sm">
                      <div className="text-purple-400">CZC(n) = (0.9999)ⁿ</div>
                      <div className="text-cyan-400 mt-1">CZC(44) = 99.56% coherence</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-black/40 border-gray-700">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-blue-400 mb-3">44 Self-Corrections</h4>
                    <p className="text-sm text-gray-300 mb-4">
                      The magic number 44 represents the optimal iteration count where coherence 
                      peaks before numerical precision limits dominate.
                    </p>
                    <div className="p-3 bg-gray-900/50 rounded font-mono text-sm">
                      <div className="text-amber-400">S = -Σ pᵢ log₂(pᵢ)</div>
                      <div className="text-green-400 mt-1">Entropy → 0 as coherence → 1</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 border-gray-700 md:col-span-2">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-amber-400 mb-3">Cross-System Applications</h4>
                    <p className="text-sm text-gray-300 mb-4">
                      The CZC Catch Basin provides coherence to all massless technologies. When 
                      coherence exceeds the threshold for a given application, binding occurs 
                      automatically.
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-yellow-500/10 rounded text-center">
                        <div className="text-yellow-400 font-semibold">Energy</div>
                        <div className="text-gray-400">≥95%</div>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded text-center">
                        <div className="text-blue-400 font-semibold">Computing</div>
                        <div className="text-gray-400">≥88%</div>
                      </div>
                      <div className="p-2 bg-cyan-500/10 rounded text-center">
                        <div className="text-cyan-400 font-semibold">Comms</div>
                        <div className="text-gray-400">≥85%</div>
                      </div>
                      <div className="p-2 bg-purple-500/10 rounded text-center">
                        <div className="text-purple-400 font-semibold">Gravity</div>
                        <div className="text-gray-400">≥99%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
