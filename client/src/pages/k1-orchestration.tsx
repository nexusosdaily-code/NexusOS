import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Activity, 
  Waves, 
  Zap, 
  Radio,
  Atom,
  Gauge,
  TrendingUp,
  Link2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface OrchestrationStatus {
  version: string;
  runtime_id: string;
  state: string;
  state_description: string;
  tick: number;
  operational_substrate: {
    state: string;
    coherence: number;
    n_modes: number;
    n_bosons: number;
    total_energy: number;
    lambda_mass: number;
  };
  nlse_substrate: {
    version: string;
    state: string;
    load_ratio: number;
    phase_ratio: number;
    soliton_order: number;
    is_stable: boolean;
    lambda_modes: number;
  };
  coordination: {
    harmonic_locks: number;
    average_lock_quality: number;
    sync_quality: number;
    resonance_strength: number;
  };
  telemetry_entries: number;
}

interface EvolveResult {
  status: string;
  steps: number;
  final_tick: number;
  sync_quality: number;
  resonance_strength: number;
  state: string;
  snapshots: any[];
}

function MetricGauge({ 
  label, 
  value, 
  maxValue = 1, 
  unit = "",
  color = "cyan"
}: { 
  label: string; 
  value: number; 
  maxValue?: number; 
  unit?: string;
  color?: string;
}) {
  const percentage = Math.min(100, (value / maxValue) * 100);
  const textColorClasses: Record<string, string> = {
    cyan: "text-cyan-400",
    green: "text-green-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
  };
  const bgColorClasses: Record<string, string> = {
    cyan: "bg-cyan-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={`${textColorClasses[color] || textColorClasses.cyan} font-mono`}>
          {typeof value === "number" ? value.toFixed(4) : value}{unit}
        </span>
      </div>
      <Progress value={percentage} className={`h-2 ${bgColorClasses[color] || bgColorClasses.cyan}`} />
    </div>
  );
}

function StateIndicator({ state, description }: { state: string; description?: string }) {
  const stateColors: Record<string, string> = {
    initializing: "bg-gray-500",
    synchronized: "bg-blue-500",
    evolving: "bg-amber-500",
    resonant: "bg-green-500",
    degraded: "bg-red-500",
    halted: "bg-gray-700",
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${stateColors[state] || "bg-gray-500"} animate-pulse`} />
      <span className="text-white font-semibold capitalize">{state}</span>
      {description && <span className="text-gray-400 text-sm">— {description}</span>}
    </div>
  );
}

export default function K1OrchestrationPage() {
  const queryClient = useQueryClient();
  const [isAutoEvolving, setIsAutoEvolving] = useState(false);
  
  const { data: status, isLoading, error, refetch } = useQuery<OrchestrationStatus>({
    queryKey: ["/api/k1/status"],
    queryFn: async () => {
      const res = await fetch("/api/k1/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: isAutoEvolving ? 500 : false,
  });
  
  const evolveMutation = useMutation<EvolveResult, Error, { n_steps: number }>({
    mutationFn: async ({ n_steps }) => {
      const res = await fetch("/api/k1/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n_steps, dt: 0.001 }),
      });
      if (!res.ok) throw new Error("Failed to evolve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/k1/status"] });
    },
  });
  
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/k1/reset", { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/k1/status"] });
      setIsAutoEvolving(false);
    },
  });
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoEvolving) {
      interval = setInterval(() => {
        evolveMutation.mutate({ n_steps: 5 });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoEvolving]);
  
  const handleToggleAutoEvolve = () => {
    if (!isAutoEvolving) {
      evolveMutation.mutate({ n_steps: 5 });
    }
    setIsAutoEvolving(!isAutoEvolving);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/k1">
          <div className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer mb-6" data-testid="link-back-k1">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to K1 Infrastructure</span>
          </div>
        </Link>
        
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-cyan-400 animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              K1 Orchestration Runtime
            </h1>
          </div>
          <p className="text-xl text-gray-400">
            Multi-Harmonic Coordination & Unified Telemetry
          </p>
        </div>
        
        <div className="flex justify-center gap-4 mb-8">
          <Button
            onClick={() => evolveMutation.mutate({ n_steps: 10 })}
            disabled={evolveMutation.isPending || isAutoEvolving}
            className="bg-cyan-600 hover:bg-cyan-500"
            data-testid="button-evolve-10"
          >
            <Zap className="w-4 h-4 mr-2" />
            Evolve 10 Steps
          </Button>
          
          <Button
            onClick={handleToggleAutoEvolve}
            className={isAutoEvolving ? "bg-amber-600 hover:bg-amber-500" : "bg-green-600 hover:bg-green-500"}
            data-testid="button-auto-evolve"
          >
            {isAutoEvolving ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause Auto-Evolve
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Auto-Evolve
              </>
            )}
          </Button>
          
          <Button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-950"
            data-testid="button-reset"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Runtime
          </Button>
        </div>
        
        {isLoading && (
          <div className="text-center text-gray-400 py-12">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
            Initializing K1 Orchestration Runtime...
          </div>
        )}
        
        {error && (
          <Card className="bg-red-950/30 border-red-500/30 p-6 text-center">
            <p className="text-red-400">
              Failed to connect to K1 Runtime. Make sure the Spectral API is running.
            </p>
            <Button onClick={() => refetch()} className="mt-4 bg-red-600 hover:bg-red-500">
              Retry Connection
            </Button>
          </Card>
        )}
        
        {status && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-950/20 border-cyan-500/30 p-6">
                <div className="text-cyan-400 text-sm mb-2">RUNTIME STATE</div>
                <StateIndicator state={status.state} description={status.state_description} />
                <div className="text-cyan-300 text-xs mt-2">Tick: {status.tick}</div>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-900/20 to-green-950/20 border-green-500/30 p-6">
                <div className="text-green-400 text-sm mb-2 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  SYNC QUALITY
                </div>
                <div className="text-3xl font-bold text-white">
                  {(status.coordination.sync_quality * 100).toFixed(1)}%
                </div>
                <div className="text-green-300 text-xs mt-1">
                  {status.coordination.harmonic_locks} harmonic locks
                </div>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/20 border-purple-500/30 p-6">
                <div className="text-purple-400 text-sm mb-2 flex items-center gap-2">
                  <Waves className="w-4 h-4" />
                  RESONANCE
                </div>
                <div className="text-3xl font-bold text-white">
                  {(status.coordination.resonance_strength * 100).toFixed(1)}%
                </div>
                <div className="text-purple-300 text-xs mt-1">
                  Cross-substrate coupling
                </div>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-900/20 to-amber-950/20 border-amber-500/30 p-6">
                <div className="text-amber-400 text-sm mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  TELEMETRY
                </div>
                <div className="text-3xl font-bold text-white">
                  {status.telemetry_entries}
                </div>
                <div className="text-amber-300 text-xs mt-1">
                  Data points collected
                </div>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-cyan-500/30 p-6">
                <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Atom className="w-5 h-5" />
                  Operational Substrate
                </h3>
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={`${
                    status.operational_substrate.state === "coherent" ? "bg-green-500/20 text-green-400" :
                    status.operational_substrate.state === "active" ? "bg-blue-500/20 text-blue-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>
                    {status.operational_substrate.state}
                  </Badge>
                  <span className="text-gray-400 text-sm">Lambda-boson field dynamics</span>
                </div>
                
                <div className="space-y-4">
                  <MetricGauge 
                    label="Coherence" 
                    value={status.operational_substrate.coherence} 
                    color="cyan"
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Modes</div>
                      <div className="text-xl font-bold text-cyan-400">{status.operational_substrate.n_modes}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Bosons</div>
                      <div className="text-xl font-bold text-cyan-400">{status.operational_substrate.n_bosons}</div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs">Total Energy</div>
                    <div className="text-lg font-mono text-cyan-300">
                      {status.operational_substrate.total_energy.toExponential(4)} J
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs">Lambda Mass (Λ)</div>
                    <div className="text-lg font-mono text-purple-300">
                      {status.operational_substrate.lambda_mass.toExponential(4)} kg
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="bg-slate-900/50 border-purple-500/30 p-6">
                <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Radio className="w-5 h-5" />
                  NLSE Substrate
                </h3>
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={`${
                    status.nlse_substrate.is_stable ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {status.nlse_substrate.is_stable ? "STABLE" : "UNSTABLE"}
                  </Badge>
                  <span className="text-gray-400 text-sm">Soliton Order: N={status.nlse_substrate.soliton_order.toFixed(2)}</span>
                </div>
                
                <div className="space-y-4">
                  <MetricGauge 
                    label="Load Ratio (lower is better)" 
                    value={status.nlse_substrate.load_ratio} 
                    color="purple"
                  />
                  
                  <MetricGauge 
                    label="Phase Ratio" 
                    value={status.nlse_substrate.phase_ratio} 
                    color="blue"
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">State</div>
                      <div className="text-lg font-bold text-purple-400 capitalize">{status.nlse_substrate.state}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Lambda Modes</div>
                      <div className="text-xl font-bold text-purple-400">{status.nlse_substrate.lambda_modes}</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            
            <Card className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/30 p-6">
              <h3 className="text-xl font-bold text-indigo-400 mb-4 flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                Harmonic Coordination
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-indigo-400">{status.coordination.harmonic_locks}</div>
                  <div className="text-gray-400 text-sm">Harmonic Locks</div>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {(status.coordination.average_lock_quality * 100).toFixed(0)}%
                  </div>
                  <div className="text-gray-400 text-sm">Lock Quality</div>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-cyan-400">
                    {(status.coordination.sync_quality * 100).toFixed(0)}%
                  </div>
                  <div className="text-gray-400 text-sm">Sync Quality</div>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">
                    {(status.coordination.resonance_strength * 100).toFixed(0)}%
                  </div>
                  <div className="text-gray-400 text-sm">Resonance</div>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <MetricGauge 
                  label="Synchronization Quality" 
                  value={status.coordination.sync_quality} 
                  color="cyan"
                />
                <MetricGauge 
                  label="Resonance Strength" 
                  value={status.coordination.resonance_strength} 
                  color="purple"
                />
                <MetricGauge 
                  label="Average Lock Quality" 
                  value={status.coordination.average_lock_quality} 
                  color="green"
                />
              </div>
            </Card>
            
            <Card className="bg-slate-900/30 border-gray-700 p-4">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>K1 Orchestration Runtime v{status.version}</span>
                <span>Runtime ID: {status.runtime_id}</span>
                <span>Physics: Λ = hf/c²</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
