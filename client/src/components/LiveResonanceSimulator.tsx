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
  Gauge
} from "lucide-react";

const SCHUMANN_HARMONICS = [7.83, 14.3, 20.8, 27.3, 33.8, 39.0, 45.0];
const PLANCK_CONSTANT = 6.62607015e-34;
const SPEED_OF_LIGHT = 299792458;

interface DataPoint {
  time: number;
  amplitude: number;
  frequency: number;
}

export function LiveResonanceSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [harvestedEnergy, setHarvestedEnergy] = useState(0);
  const [instantPower, setInstantPower] = useState(0);
  const [coherence, setCoherence] = useState(0.85);
  const [qFactor, setQFactor] = useState(1000);
  const [harvesterCount, setHarvesterCount] = useState(100);
  const [dataHistory, setDataHistory] = useState<DataPoint[]>([]);

  const calculatePower = useCallback((t: number) => {
    let totalAmplitude = 0;
    SCHUMANN_HARMONICS.forEach((freq, idx) => {
      const amplitude = Math.sin(2 * Math.PI * freq * t / 1000) / (idx + 1);
      const noise = (Math.random() - 0.5) * 0.1;
      totalAmplitude += (amplitude + noise) * coherence;
    });
    
    const basePower = Math.abs(totalAmplitude) * 1e-6 * qFactor;
    const networkBonus = 1 + (harvesterCount - 1) * coherence ** 2;
    return basePower * networkBonus * harvesterCount;
  }, [coherence, qFactor, harvesterCount]);

  const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#1e3a5f';
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
    
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    const colors = ['#22d3ee', '#a855f7', '#22c55e', '#facc15', '#f97316', '#ec4899', '#3b82f6'];
    
    SCHUMANN_HARMONICS.forEach((freq, idx) => {
      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      
      for (let x = 0; x < width; x++) {
        const phase = (t / 1000 + x / 50) * freq * 2 * Math.PI;
        const amplitude = (height / 4) / (idx + 1);
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
    ctx.lineWidth = 3;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      let y = height / 2;
      SCHUMANN_HARMONICS.forEach((freq, idx) => {
        const phase = (t / 1000 + x / 50) * freq * 2 * Math.PI;
        const amplitude = (height / 6) / (idx + 1);
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
    
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`t = ${(t / 1000).toFixed(2)}s`, 10, 20);
    ctx.fillText(`Schumann Resonance: 7.83 Hz`, 10, 36);
  }, [coherence]);

  const drawSpectrum = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    const barWidth = width / (SCHUMANN_HARMONICS.length * 2);
    const colors = ['#22d3ee', '#a855f7', '#22c55e', '#facc15', '#f97316', '#ec4899', '#3b82f6'];
    
    SCHUMANN_HARMONICS.forEach((freq, idx) => {
      const baseHeight = (height * 0.8) / (idx + 1);
      const variation = Math.sin(t / 500 + idx) * baseHeight * 0.3;
      const barHeight = (baseHeight + variation) * coherence;
      
      const x = idx * barWidth * 2 + barWidth / 2;
      const y = height - barHeight;
      
      const gradient = ctx.createLinearGradient(x, height, x, y);
      gradient.addColorStop(0, colors[idx]);
      gradient.addColorStop(1, colors[idx] + '33');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${freq}Hz`, x + barWidth / 2, height - 5);
    });
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Frequency Spectrum (Hz)', 5, 15);
  }, [coherence]);

  useEffect(() => {
    if (!isRunning) return;

    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      setTime(prev => prev + deltaTime);
      
      const power = calculatePower(currentTime);
      setInstantPower(power);
      setHarvestedEnergy(prev => prev + power * deltaTime / 1000);
      
      const canvas = canvasRef.current;
      const spectrum = spectrumRef.current;
      
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawWaveform(ctx, canvas.width, canvas.height, currentTime);
        }
      }
      
      if (spectrum) {
        const ctx = spectrum.getContext('2d');
        if (ctx) {
          drawSpectrum(ctx, spectrum.width, spectrum.height, currentTime);
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, calculatePower, drawWaveform, drawSpectrum]);

  const toggleSimulation = () => {
    if (!isRunning) {
      setTime(0);
      setHarvestedEnergy(0);
    }
    setIsRunning(!isRunning);
  };

  const formatEnergy = (joules: number) => {
    if (joules < 1e-6) return `${(joules * 1e9).toFixed(2)} nJ`;
    if (joules < 1e-3) return `${(joules * 1e6).toFixed(2)} µJ`;
    if (joules < 1) return `${(joules * 1e3).toFixed(2)} mJ`;
    if (joules < 1000) return `${joules.toFixed(2)} J`;
    return `${(joules / 1000).toFixed(2)} kJ`;
  };

  const formatPower = (watts: number) => {
    if (watts < 1e-9) return `${(watts * 1e12).toFixed(2)} pW`;
    if (watts < 1e-6) return `${(watts * 1e9).toFixed(2)} nW`;
    if (watts < 1e-3) return `${(watts * 1e6).toFixed(2)} µW`;
    if (watts < 1) return `${(watts * 1e3).toFixed(2)} mW`;
    return `${watts.toFixed(2)} W`;
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-cyan-500/30 p-6" data-testid="live-resonance-simulator">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Activity className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Live Resonance Simulator</h2>
            <p className="text-sm text-gray-400">Real-time Schumann resonance extraction modeling</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={isRunning ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
            {isRunning ? "● LIVE" : "○ PAUSED"}
          </Badge>
          <Button
            onClick={toggleSimulation}
            className={isRunning ? "bg-red-600 hover:bg-red-700" : "bg-cyan-600 hover:bg-cyan-700"}
            data-testid="btn-toggle-simulation"
          >
            {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRunning ? "Stop" : "Start"} Simulation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Waves className="w-4 h-4" />
              Composite Waveform (7 Schumann Harmonics)
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full rounded-lg border border-slate-700"
              data-testid="canvas-waveform"
            />
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Frequency Spectrum Analysis
            </div>
            <canvas
              ref={spectrumRef}
              width={600}
              height={120}
              className="w-full rounded-lg border border-slate-700"
              data-testid="canvas-spectrum"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-950/30 border border-cyan-500/30 rounded-lg p-4">
            <div className="text-xs text-cyan-400 mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              INSTANT POWER
            </div>
            <div className="text-3xl font-bold text-white font-mono" data-testid="text-instant-power">
              {formatPower(instantPower)}
            </div>
            <Progress value={Math.min((instantPower / 1e-3) * 100, 100)} className="h-2 mt-2" />
          </div>

          <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/30 rounded-lg p-4">
            <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              HARVESTED ENERGY
            </div>
            <div className="text-3xl font-bold text-white font-mono" data-testid="text-harvested-energy">
              {formatEnergy(harvestedEnergy)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Runtime: {(time / 1000).toFixed(1)}s
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-500/30 rounded-lg p-4">
            <div className="text-xs text-purple-400 mb-1 flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              NETWORK EFFICIENCY
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {((1 + (harvesterCount - 1) * coherence ** 2) * 100 / harvesterCount).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Coherence bonus: {(1 + (harvesterCount - 1) * coherence ** 2).toFixed(1)}×
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/30 rounded-lg p-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Q-Factor</span>
            <span className="text-white font-mono">{qFactor.toLocaleString()}</span>
          </div>
          <Slider
            value={[Math.log10(qFactor)]}
            onValueChange={(v) => setQFactor(Math.round(Math.pow(10, v[0])))}
            min={2}
            max={6}
            step={0.1}
            className="w-full"
            data-testid="slider-q-factor"
          />
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Harvester Count</span>
            <span className="text-white font-mono">{harvesterCount}</span>
          </div>
          <Slider
            value={[harvesterCount]}
            onValueChange={(v) => setHarvesterCount(v[0])}
            min={1}
            max={500}
            step={1}
            className="w-full"
            data-testid="slider-harvester-count"
          />
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Network Coherence</span>
            <span className="text-white font-mono">{(coherence * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[coherence * 100]}
            onValueChange={(v) => setCoherence(v[0] / 100)}
            min={0}
            max={100}
            step={1}
            className="w-full"
            data-testid="slider-coherence"
          />
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Simulation based on Schumann resonance physics (7.83 Hz fundamental + harmonics) • Q-factor amplification • Phase-locked network coherence
      </div>
    </Card>
  );
}
