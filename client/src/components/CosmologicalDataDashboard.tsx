import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sun,
  Wind,
  Activity,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Satellite,
  Waves,
  TrendingUp,
  Globe,
  Loader2,
  ExternalLink
} from "lucide-react";

interface SolarWindData {
  time_tag: string;
  density: number;
  speed: number;
  temperature: number;
}

interface KIndexData {
  time_tag: string;
  kp_index: number;
  estimated_kp: number;
}

interface SolarFlareData {
  flareclass: string;
  begintime: string;
  peaktime: string;
  endtime: string;
}

interface ProtonFluxData {
  time_tag: string;
  flux: number;
  energy: string;
}

interface SpaceWeatherState {
  solarWind: SolarWindData | null;
  kIndex: KIndexData | null;
  solarFlares: SolarFlareData | null;
  protonFlux: ProtonFluxData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const NOAA_ENDPOINTS = {
  solarWind: "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json",
  kIndex: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  solarFlares: "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json",
  protonFlux: "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json"
};

function getKpColor(kp: number): string {
  if (kp <= 3) return "text-green-400";
  if (kp <= 5) return "text-yellow-400";
  if (kp <= 7) return "text-orange-400";
  return "text-red-400";
}

function getKpBadge(kp: number): { text: string; className: string } {
  if (kp <= 1) return { text: "Quiet", className: "bg-green-500/20 text-green-400 border-green-500/30" };
  if (kp <= 3) return { text: "Unsettled", className: "bg-green-500/20 text-green-400 border-green-500/30" };
  if (kp <= 4) return { text: "Active", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  if (kp <= 5) return { text: "Minor Storm", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
  if (kp <= 6) return { text: "Moderate Storm", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
  if (kp <= 7) return { text: "Strong Storm", className: "bg-red-500/20 text-red-400 border-red-500/30" };
  if (kp <= 8) return { text: "Severe Storm", className: "bg-red-500/20 text-red-400 border-red-500/30" };
  return { text: "Extreme Storm", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
}

function getFlareClassColor(flareClass: string): string {
  if (flareClass.startsWith('X')) return "text-red-400";
  if (flareClass.startsWith('M')) return "text-orange-400";
  if (flareClass.startsWith('C')) return "text-yellow-400";
  if (flareClass.startsWith('B')) return "text-green-400";
  return "text-gray-400";
}

function calculateSchumannEffect(kp: number, solarWindSpeed: number): { effect: string; modifier: number } {
  const baseModifier = 1.0;
  const kpEffect = kp * 0.02;
  const windEffect = (solarWindSpeed - 400) / 1000 * 0.1;
  const modifier = baseModifier + kpEffect + windEffect;
  
  if (kp >= 6 || solarWindSpeed > 600) {
    return { effect: "Strong geomagnetic disturbance - Schumann resonance amplitude enhanced", modifier };
  }
  if (kp >= 4 || solarWindSpeed > 500) {
    return { effect: "Moderate solar activity - slight frequency variations expected", modifier };
  }
  return { effect: "Quiet conditions - stable Schumann resonance", modifier };
}

export function CosmologicalDataDashboard() {
  const [state, setState] = useState<SpaceWeatherState>({
    solarWind: null,
    kIndex: null,
    solarFlares: null,
    protonFlux: null,
    loading: false,
    error: null,
    lastUpdated: null
  });
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchSpaceWeather = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [solarWindRes, kIndexRes, solarFlaresRes, protonFluxRes] = await Promise.allSettled([
        fetch(NOAA_ENDPOINTS.solarWind),
        fetch(NOAA_ENDPOINTS.kIndex),
        fetch(NOAA_ENDPOINTS.solarFlares),
        fetch(NOAA_ENDPOINTS.protonFlux)
      ]);

      let solarWind: SolarWindData | null = null;
      let kIndex: KIndexData | null = null;
      let solarFlares: SolarFlareData | null = null;
      let protonFlux: ProtonFluxData | null = null;

      if (solarWindRes.status === 'fulfilled' && solarWindRes.value.ok) {
        const data = await solarWindRes.value.json();
        if (Array.isArray(data) && data.length > 1) {
          const latest = data[data.length - 1];
          solarWind = {
            time_tag: latest[0],
            density: parseFloat(latest[1]) || 0,
            speed: parseFloat(latest[2]) || 0,
            temperature: parseFloat(latest[3]) || 0
          };
        }
      }

      if (kIndexRes.status === 'fulfilled' && kIndexRes.value.ok) {
        const data = await kIndexRes.value.json();
        if (Array.isArray(data) && data.length > 1) {
          const latest = data[data.length - 1];
          kIndex = {
            time_tag: latest[0],
            kp_index: parseFloat(latest[1]) || 0,
            estimated_kp: parseFloat(latest[2]) || 0
          };
        }
      }

      if (solarFlaresRes.status === 'fulfilled' && solarFlaresRes.value.ok) {
        const data = await solarFlaresRes.value.json();
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[0];
          solarFlares = {
            flareclass: latest.current_class || latest.max_class || 'None',
            begintime: latest.begin_time || '',
            peaktime: latest.max_time || '',
            endtime: latest.end_time || ''
          };
        }
      }

      if (protonFluxRes.status === 'fulfilled' && protonFluxRes.value.ok) {
        const data = await protonFluxRes.value.json();
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[data.length - 1];
          protonFlux = {
            time_tag: latest.time_tag || '',
            flux: parseFloat(latest.flux) || 0,
            energy: latest.energy || '>10 MeV'
          };
        }
      }

      setState({
        solarWind,
        kIndex,
        solarFlares,
        protonFlux,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch space weather data'
      }));
    }
  }, []);

  useEffect(() => {
    fetchSpaceWeather();
  }, [fetchSpaceWeather]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSpaceWeather, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSpaceWeather]);

  const kpValue = state.kIndex?.kp_index || state.kIndex?.estimated_kp || 0;
  const windSpeed = state.solarWind?.speed || 400;
  const schumannEffect = calculateSchumannEffect(kpValue, windSpeed);
  const kpBadge = getKpBadge(kpValue);

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-cyan-500/30 p-6" data-testid="cosmological-dashboard">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Satellite className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Live Space Weather</h2>
            <p className="text-sm text-gray-400">Real-time data from NOAA SWPC satellites</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={autoRefresh ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
            {autoRefresh ? "● AUTO-REFRESH" : "○ MANUAL"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="border-slate-600"
            data-testid="btn-toggle-auto-refresh"
          >
            {autoRefresh ? "Pause" : "Auto"}
          </Button>
          <Button
            onClick={fetchSpaceWeather}
            disabled={state.loading}
            className="bg-cyan-600 hover:bg-cyan-700"
            data-testid="btn-refresh-data"
          >
            {state.loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {state.error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{state.error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-yellow-900/30 to-orange-950/30 border-yellow-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-400">Solar Wind</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono" data-testid="text-solar-wind-speed">
            {state.solarWind?.speed?.toFixed(0) || '--'} km/s
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Density: {state.solarWind?.density?.toFixed(1) || '--'} p/cm³
          </div>
          <Progress 
            value={Math.min(((state.solarWind?.speed || 0) / 800) * 100, 100)} 
            className="h-1 mt-2" 
          />
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-emerald-950/30 border-green-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Kp Index</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${getKpColor(kpValue)}`} data-testid="text-kp-index">
            {kpValue.toFixed(1)}
          </div>
          <Badge className={`${kpBadge.className} text-xs mt-1`}>
            {kpBadge.text}
          </Badge>
          <Progress 
            value={(kpValue / 9) * 100} 
            className="h-1 mt-2" 
          />
        </Card>

        <Card className="bg-gradient-to-br from-red-900/30 to-orange-950/30 border-red-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-400">Solar Flares</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${getFlareClassColor(state.solarFlares?.flareclass || 'None')}`} data-testid="text-solar-flare">
            {state.solarFlares?.flareclass || 'None'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {state.solarFlares?.peaktime ? `Peak: ${new Date(state.solarFlares.peaktime).toLocaleTimeString()}` : 'No active flares'}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-violet-950/30 border-purple-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Proton Flux</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono" data-testid="text-proton-flux">
            {state.protonFlux?.flux?.toExponential(1) || '--'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {state.protonFlux?.energy || '>10 MeV'} particles/cm²/s/sr
          </div>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-cyan-900/20 to-blue-950/20 border-cyan-500/30 p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Waves className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Schumann Resonance Impact</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Current Conditions</div>
            <div className="text-white font-medium">{schumannEffect.effect}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Amplitude Modifier</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">
              {schumannEffect.modifier.toFixed(2)}×
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Harvesting Efficiency</div>
            <div className={`text-xl font-bold font-mono ${schumannEffect.modifier >= 1.1 ? 'text-green-400' : 'text-white'}`}>
              {schumannEffect.modifier >= 1.1 ? (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Enhanced
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Normal
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Data source: NOAA Space Weather Prediction Center</span>
          <a 
            href="https://www.swpc.noaa.gov/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            swpc.noaa.gov
          </a>
        </div>
        <div>
          {state.lastUpdated && `Last updated: ${state.lastUpdated.toLocaleTimeString()}`}
        </div>
      </div>
    </Card>
  );
}
