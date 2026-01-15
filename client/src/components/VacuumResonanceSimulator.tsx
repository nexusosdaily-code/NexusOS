import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  Zap, 
  Waves, 
  Radio, 
  Activity,
  TrendingUp,
  Gauge,
  Link2,
  Unlink2,
  RefreshCw,
  Snowflake,
  Atom
} from "lucide-react";

const FIRST_OSCILLATION_THZ = 555.0;
const FIRST_OSCILLATION_HZ = 555e12;
const PLANCK_CONSTANT = 6.62607015e-34;
const SPEED_OF_LIGHT = 299792458;
const FREE_SPACE_IMPEDANCE = 376.730313668;
const GOLDEN_RATIO = 1.618033988749;
const GOLDEN_ANGLE_DEG = 137.5077;

const VACUUM_HARMONICS = [
  FIRST_OSCILLATION_THZ,
  FIRST_OSCILLATION_THZ / GOLDEN_RATIO,
  FIRST_OSCILLATION_THZ / (GOLDEN_RATIO ** 2),
  FIRST_OSCILLATION_THZ / (GOLDEN_RATIO ** 3),
  FIRST_OSCILLATION_THZ * GOLDEN_RATIO,
  FIRST_OSCILLATION_THZ * (GOLDEN_RATIO ** 2),
];

const HARMONIC_LABELS = [
  "Λ₀ (First Oscillation)",
  "Λ₁ (φ⁻¹)",
  "Λ₂ (φ⁻²)",
  "Λ₃ (φ⁻³)",
  "Λ₊₁ (φ¹)",
  "Λ₊₂ (φ²)",
];

interface VacuumSyncData {
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

export function VacuumResonanceSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [time, setTime] = useState(0);
  const [coldEnergy, setColdEnergy] = useState(0);
  const [instantPower, setInstantPower] = useState(0);
  const [coherence, setCoherence] = useState(0.9999);
  const [impedanceMatch, setImpedanceMatch] = useState(377.0);
  const [phaseAngle, setPhaseAngle] = useState(GOLDEN_ANGLE_DEG);
  const [cavityCount, setCavityCount] = useState(44);
  const [syncData, setSyncData] = useState<VacuumSyncData | null>(null);
  const [vacuumFluctuation, setVacuumFluctuation] = useState(0);
  const [lambdaMass, setLambdaMass] = useState(0);
  
  const lastSyncEnergy = useRef(0);
  
  const stateRef = useRef({
    coldEnergy: 0,
    instantPower: 0,
    coherence: 0.9999,
    cavityCount: 44,
    isSynced: false
  });
  
  useEffect(() => {
    stateRef.current = { coldEnergy, instantPower, coherence, cavityCount, isSynced };
  }, [coldEnergy, instantPower, coherence, cavityCount, isSynced]);

  const fetchSyncData = useCallback(async () => {
    try {
      const response = await fetch('/api/k1/simulator/sync');
      if (response.ok) {
        const data = await response.json();
        setSyncData(data);
        if (stateRef.current.isSynced && data.backend_coherence) {
          setCoherence(prev => Math.min(0.9999, prev * 0.95 + data.backend_coherence * 0.05));
        }
      }
    } catch (error) {
      console.error('Vacuum sync fetch error:', error);
    }
  }, []);

  const injectEnergy = useCallback(async () => {
    const { coldEnergy, instantPower, coherence, cavityCount, isSynced } = stateRef.current;
    
    if (!isSynced || coldEnergy <= lastSyncEnergy.current) return;
    
    const deltaEnergy = coldEnergy - lastSyncEnergy.current;
    lastSyncEnergy.current = coldEnergy;
    
    try {
      await fetch('/api/k1/simulator/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          harvested_energy: deltaEnergy,
          instant_power: instantPower,
          coherence,
          harvester_count: cavityCount,
          source: 'vacuum_555thz'
        })
      });
    } catch (error) {
      console.error('Vacuum energy injection error:', error);
    }
  }, []);

  useEffect(() => {
    if (isSynced) {
      fetchSyncData();
      injectEnergy();
      
      syncIntervalRef.current = setInterval(() => {
        fetchSyncData();
        injectEnergy();
      }, 2000);
    }
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isSynced, fetchSyncData, injectEnergy]);

  const calculateVacuumPower = useCallback((t: number) => {
    const zeroPointEnergy = PLANCK_CONSTANT * FIRST_OSCILLATION_HZ / 2;
    const impedanceFactor = 1 - Math.abs(impedanceMatch - FREE_SPACE_IMPEDANCE) / FREE_SPACE_IMPEDANCE;
    const phaseFactor = Math.cos((phaseAngle - GOLDEN_ANGLE_DEG) * Math.PI / 180);
    const coherenceFactor = coherence ** 44;
    
    let fluctuation = 0;
    VACUUM_HARMONICS.forEach((freq, idx) => {
      const normalizedFreq = freq / FIRST_OSCILLATION_THZ;
      const phase = (t / 100) * normalizedFreq * 2 * Math.PI;
      fluctuation += Math.sin(phase) / (idx + 1);
    });
    fluctuation = (fluctuation + 3) / 6;
    setVacuumFluctuation(fluctuation);
    
    const mass = PLANCK_CONSTANT * FIRST_OSCILLATION_HZ / (SPEED_OF_LIGHT ** 2);
    setLambdaMass(mass);
    
    const basePower = zeroPointEnergy * fluctuation * impedanceFactor * phaseFactor * coherenceFactor;
    const cavityAmplification = cavityCount * (1 + coherence ** 2 * (cavityCount - 1));
    const syncBonus = isSynced && syncData ? (1 + syncData.resonance_strength * 0.2) : 1;
    
    return Math.abs(basePower * cavityAmplification * syncBonus * 1e12);
  }, [coherence, impedanceMatch, phaseAngle, cavityCount, isSynced, syncData]);

  const drawVacuumField = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => {
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;
    
    for (let r = maxRadius; r > 0; r -= 8) {
      const hue = 280 - (r / maxRadius) * 60;
      const alpha = 0.1 + (1 - r / maxRadius) * 0.3;
      ctx.strokeStyle = `hsla(${hue}, 80%, 50%, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      const points = 144;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const goldenOffset = Math.sin(angle * GOLDEN_RATIO + t / 500) * (maxRadius - r) * 0.1;
        const fluctOffset = Math.sin(angle * 7 + t / 200) * r * 0.02 * coherence;
        const px = centerX + Math.cos(angle) * (r + goldenOffset + fluctOffset);
        const py = centerY + Math.sin(angle) * (r + goldenOffset + fluctOffset);
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
    gradient.addColorStop(0, `rgba(168, 85, 247, ${0.8 * coherence})`);
    gradient.addColorStop(0.5, `rgba(168, 85, 247, ${0.3 * coherence})`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Λ₀', centerX, centerY + 4);
    
    ctx.fillStyle = '#e0e7ff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`555 THz`, 10, 15);
    ctx.fillText(`φ = ${GOLDEN_RATIO.toFixed(6)}`, 10, 28);
    ctx.fillText(`Z₀ = ${FREE_SPACE_IMPEDANCE.toFixed(1)}Ω`, 10, 41);
  }, [coherence]);

  const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => {
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    const colors = ['#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9', '#c084fc', '#d8b4fe'];
    
    VACUUM_HARMONICS.forEach((freq, idx) => {
      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = idx === 0 ? 3 : 2;
      ctx.globalAlpha = idx === 0 ? 1 : 0.5;
      ctx.beginPath();
      
      const normalizedFreq = freq / FIRST_OSCILLATION_THZ;
      for (let x = 0; x < width; x++) {
        const phase = (t / 100 + x / 30) * normalizedFreq * 2 * Math.PI;
        const amplitude = (height / 4) / (Math.abs(idx - 2) + 1);
        const y = height / 2 + Math.sin(phase) * amplitude * coherence;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });
    
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = isSynced ? '#22c55e' : '#a855f7';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      let y = height / 2;
      VACUUM_HARMONICS.forEach((freq, idx) => {
        const normalizedFreq = freq / FIRST_OSCILLATION_THZ;
        const phase = (t / 100 + x / 30) * normalizedFreq * 2 * Math.PI;
        const amplitude = (height / 6) / (Math.abs(idx - 2) + 1);
        y += Math.sin(phase) * amplitude * coherence;
      });
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = isSynced ? '#22c55e' : '#a855f7';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`t = ${(t / 1000).toFixed(3)}s`, 10, 16);
    ctx.fillText(`First Oscillation: 555 THz`, 10, 30);
    ctx.fillText(`Λ = hf/c² = ${lambdaMass.toExponential(3)} kg`, 10, 44);
  }, [coherence, isSynced, lambdaMass]);

  const drawSpectrum = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => {
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = width / (VACUUM_HARMONICS.length * 2 + 1);
    const colors = ['#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9', '#c084fc', '#d8b4fe'];
    
    VACUUM_HARMONICS.forEach((freq, idx) => {
      const normalizedFreq = freq / FIRST_OSCILLATION_THZ;
      const baseHeight = (height * 0.75) * (idx === 0 ? 1 : 0.6 / Math.abs(normalizedFreq - 1 + 0.5));
      const variation = Math.sin(t / 300 + idx * GOLDEN_RATIO) * baseHeight * 0.15;
      const barHeight = Math.min(height * 0.9, Math.abs(baseHeight + variation) * coherence);
      
      const x = idx * barWidth * 2 + barWidth;
      const y = height - barHeight - 15;
      
      const gradient = ctx.createLinearGradient(x, height - 15, x, y);
      gradient.addColorStop(0, colors[idx]);
      gradient.addColorStop(1, colors[idx] + '44');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth * 1.5, barHeight);
      
      ctx.shadowColor = colors[idx];
      ctx.shadowBlur = 10;
      ctx.fillRect(x, y, barWidth * 1.5, 3);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#e0e7ff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${freq.toFixed(0)}`, x + barWidth * 0.75, height - 3);
    });
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Vacuum Spectrum (THz) — Golden Ratio Harmonics', 5, 12);
  }, [coherence]);

  useEffect(() => {
    if (!isRunning) return;

    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      setTime(prev => prev + deltaTime);
      
      const power = calculateVacuumPower(currentTime);
      setInstantPower(power);
      setColdEnergy(prev => prev + power * deltaTime / 1000);
      
      const canvas = canvasRef.current;
      const spectrum = spectrumRef.current;
      const field = fieldRef.current;
      
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) drawWaveform(ctx, canvas.width, canvas.height, currentTime);
      }
      
      if (spectrum) {
        const ctx = spectrum.getContext('2d');
        if (ctx) drawSpectrum(ctx, spectrum.width, spectrum.height, currentTime);
      }
      
      if (field) {
        const ctx = field.getContext('2d');
        if (ctx) drawVacuumField(ctx, field.width, field.height, currentTime);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, calculateVacuumPower, drawWaveform, drawSpectrum, drawVacuumField]);

  const toggleSimulation = () => {
    if (!isRunning) {
      setTime(0);
      setColdEnergy(0);
      lastSyncEnergy.current = 0;
    }
    setIsRunning(!isRunning);
  };

  const toggleSync = () => {
    setIsSynced(!isSynced);
    if (!isSynced) {
      fetchSyncData();
    }
  };

  const formatEnergy = (joules: number) => {
    if (joules < 1e-18) return `${(joules * 1e21).toFixed(2)} zJ`;
    if (joules < 1e-15) return `${(joules * 1e18).toFixed(2)} aJ`;
    if (joules < 1e-12) return `${(joules * 1e15).toFixed(2)} fJ`;
    if (joules < 1e-9) return `${(joules * 1e12).toFixed(2)} pJ`;
    if (joules < 1e-6) return `${(joules * 1e9).toFixed(2)} nJ`;
    if (joules < 1e-3) return `${(joules * 1e6).toFixed(2)} µJ`;
    if (joules < 1) return `${(joules * 1e3).toFixed(2)} mJ`;
    return `${joules.toFixed(2)} J`;
  };

  const formatPower = (watts: number) => {
    if (watts < 1e-18) return `${(watts * 1e21).toFixed(2)} zW`;
    if (watts < 1e-15) return `${(watts * 1e18).toFixed(2)} aW`;
    if (watts < 1e-12) return `${(watts * 1e15).toFixed(2)} fW`;
    if (watts < 1e-9) return `${(watts * 1e12).toFixed(2)} pW`;
    if (watts < 1e-6) return `${(watts * 1e9).toFixed(2)} nW`;
    if (watts < 1e-3) return `${(watts * 1e6).toFixed(2)} µW`;
    if (watts < 1) return `${(watts * 1e3).toFixed(2)} mW`;
    return `${watts.toFixed(2)} W`;
  };

  return (
    <Card className="bg-gradient-to-br from-violet-950 to-slate-950 border-purple-500/30 p-6" data-testid="vacuum-resonance-simulator">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Atom className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Vacuum Resonance Simulator</h2>
            <p className="text-sm text-gray-400">555 THz First Oscillation — Cold Energy Extraction</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleSync}
            variant="outline"
            className={isSynced 
              ? "border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20" 
              : "border-gray-500/50 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20"}
            data-testid="btn-vacuum-toggle-sync"
          >
            {isSynced ? <Link2 className="w-4 h-4 mr-2" /> : <Unlink2 className="w-4 h-4 mr-2" />}
            {isSynced ? "K1 Synced" : "Sync K1"}
          </Button>
          <Badge className={isRunning ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
            <Snowflake className="w-3 h-3 mr-1" />
            {isRunning ? "● COLD EXTRACTION" : "○ STANDBY"}
          </Badge>
          <Button
            onClick={toggleSimulation}
            className={isRunning ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}
            data-testid="btn-vacuum-toggle-simulation"
          >
            {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRunning ? "Stop" : "Start"} Extraction
          </Button>
        </div>
      </div>

      {isSynced && syncData && (
        <div className="mb-6 bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-green-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-sm font-semibold text-green-400">K1 Vacuum Sync Active</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Backend Coherence</span>
              <p className="text-white font-mono">{(syncData.backend_coherence * 100).toFixed(2)}%</p>
            </div>
            <div>
              <span className="text-gray-400">Lambda Mass Pool</span>
              <p className="text-white font-mono">{syncData.lambda_mass?.toExponential(2) || '0'}</p>
            </div>
            <div>
              <span className="text-gray-400">Sync Quality</span>
              <p className="text-white font-mono">{(syncData.sync_quality * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-gray-400">K1 State</span>
              <p className="text-white font-mono">{syncData.k1_state || 'COHERENT'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-1">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Atom className="w-4 h-4" />
              Vacuum Field Topology
            </div>
            <canvas
              ref={fieldRef}
              width={200}
              height={200}
              className="w-full rounded-lg border border-purple-500/30"
              data-testid="canvas-vacuum-field"
            />
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Waves className="w-4 h-4" />
              Lambda Waveform (Golden Ratio Harmonics)
            </div>
            <canvas
              ref={canvasRef}
              width={500}
              height={160}
              className="w-full rounded-lg border border-purple-500/30"
              data-testid="canvas-vacuum-waveform"
            />
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Vacuum Spectrum Analysis
            </div>
            <canvas
              ref={spectrumRef}
              width={500}
              height={100}
              className="w-full rounded-lg border border-purple-500/30"
              data-testid="canvas-vacuum-spectrum"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-500/30 rounded-lg p-4">
            <div className="text-xs text-purple-400 mb-1 flex items-center gap-1">
              <Snowflake className="w-3 h-3" />
              COLD POWER
            </div>
            <div className="text-2xl font-bold text-white font-mono" data-testid="text-vacuum-instant-power">
              {formatPower(instantPower)}
            </div>
            <Progress value={Math.min(vacuumFluctuation * 100, 100)} className="h-2 mt-2" />
            <div className="text-xs text-gray-400 mt-1">Fluctuation: {(vacuumFluctuation * 100).toFixed(1)}%</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-950/30 border border-indigo-500/30 rounded-lg p-4">
            <div className="text-xs text-indigo-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              EXTRACTED ENERGY
            </div>
            <div className="text-2xl font-bold text-white font-mono" data-testid="text-vacuum-cold-energy">
              {formatEnergy(coldEnergy)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Runtime: {(time / 1000).toFixed(2)}s
            </div>
          </div>

          <div className="bg-gradient-to-br from-fuchsia-900/30 to-fuchsia-950/30 border border-fuchsia-500/30 rounded-lg p-4">
            <div className="text-xs text-fuchsia-400 mb-1 flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              COHERENCE (CZC)
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {(coherence * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              CZC⁴⁴ = {(coherence ** 44 * 100).toFixed(4)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/30 rounded-lg p-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Impedance (Ω)</span>
            <span className="text-white font-mono">{impedanceMatch.toFixed(1)}</span>
          </div>
          <Slider
            value={[impedanceMatch]}
            onValueChange={(v) => setImpedanceMatch(v[0])}
            min={350}
            max={400}
            step={0.1}
            className="w-full"
            data-testid="slider-vacuum-impedance"
          />
          <div className="text-xs text-gray-500 mt-1">Target: 376.73Ω (Z₀)</div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Phase Angle (°)</span>
            <span className="text-white font-mono">{phaseAngle.toFixed(2)}</span>
          </div>
          <Slider
            value={[phaseAngle]}
            onValueChange={(v) => setPhaseAngle(v[0])}
            min={90}
            max={180}
            step={0.01}
            className="w-full"
            data-testid="slider-vacuum-phase"
          />
          <div className="text-xs text-gray-500 mt-1">Golden: 137.51°</div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Cavity Count</span>
            <span className="text-white font-mono">{cavityCount}</span>
          </div>
          <Slider
            value={[cavityCount]}
            onValueChange={(v) => setCavityCount(v[0])}
            min={1}
            max={144}
            step={1}
            className="w-full"
            data-testid="slider-vacuum-cavity"
          />
          <div className="text-xs text-gray-500 mt-1">CZF optimal: 44</div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Coherence</span>
            <span className="text-white font-mono">{(coherence * 100).toFixed(2)}%</span>
          </div>
          <Slider
            value={[coherence * 100]}
            onValueChange={(v) => setCoherence(v[0] / 100)}
            min={90}
            max={99.99}
            step={0.01}
            className="w-full"
            data-testid="slider-vacuum-coherence"
          />
          <div className="text-xs text-gray-500 mt-1">CZF target: 99.99%</div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Λ = hf/c² • First Oscillation: 555 THz • Zero-point vacuum fluctuation extraction • Golden ratio harmonic cascade
        {isSynced && <span className="text-green-400 ml-1">• Synchronized with K1 Orchestration Runtime</span>}
      </div>
    </Card>
  );
}
