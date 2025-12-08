import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Waves,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Atom,
  Sigma,
  Activity,
  Zap,
  BookOpen,
  Calculator
} from "lucide-react";

const PLANCK_CONSTANT = 6.62607015e-34;
const REDUCED_PLANCK = PLANCK_CONSTANT / (2 * Math.PI);
const SPEED_OF_LIGHT = 299792458;

interface EigenstateConfig {
  n: number;
  amplitude: number;
  phase: number;
}

interface WavefieldPoint {
  r: number;
  realPart: number;
  imagPart: number;
  magnitude: number;
  phase: number;
}

function wavelengthToColor(wavelengthNm: number): string {
  let r = 0, g = 0, b = 0;
  if (wavelengthNm >= 380 && wavelengthNm < 440) {
    r = -(wavelengthNm - 440) / (440 - 380);
    b = 1;
  } else if (wavelengthNm >= 440 && wavelengthNm < 490) {
    g = (wavelengthNm - 440) / (490 - 440);
    b = 1;
  } else if (wavelengthNm >= 490 && wavelengthNm < 510) {
    g = 1;
    b = -(wavelengthNm - 510) / (510 - 490);
  } else if (wavelengthNm >= 510 && wavelengthNm < 580) {
    r = (wavelengthNm - 510) / (580 - 510);
    g = 1;
  } else if (wavelengthNm >= 580 && wavelengthNm < 645) {
    r = 1;
    g = -(wavelengthNm - 645) / (645 - 580);
  } else if (wavelengthNm >= 645 && wavelengthNm <= 780) {
    r = 1;
  }
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

function psi_n(r: number, n: number, L: number): number {
  return Math.sqrt(2 / L) * Math.sin((n * Math.PI * r) / L);
}

function omega_n(n: number, L: number, m: number = 1): number {
  const E_n = (n * n * Math.PI * Math.PI * REDUCED_PLANCK * REDUCED_PLANCK) / (2 * m * L * L);
  return E_n / REDUCED_PLANCK;
}

function calculateWavefield(
  r: number,
  t: number,
  eigenstates: EigenstateConfig[],
  L: number,
  mass: number = 1
): { real: number; imag: number } {
  let real = 0;
  let imag = 0;

  for (const state of eigenstates) {
    const psi = psi_n(r, state.n, L);
    const omega = omega_n(state.n, L, mass);
    const phaseAngle = -omega * t + state.phase;
    
    real += state.amplitude * psi * Math.cos(phaseAngle);
    imag += state.amplitude * psi * Math.sin(phaseAngle);
  }

  return { real, imag };
}

export default function WavefieldPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [time, setTime] = useState(0);
  const [timeScale, setTimeScale] = useState([1]);
  const [boxLength, setBoxLength] = useState([10]);
  const [resolution, setResolution] = useState([200]);
  
  const [eigenstates, setEigenstates] = useState<EigenstateConfig[]>([
    { n: 1, amplitude: 0.7, phase: 0 },
    { n: 2, amplitude: 0.5, phase: Math.PI / 4 },
    { n: 3, amplitude: 0.3, phase: Math.PI / 2 },
  ]);

  const [newState, setNewState] = useState({ n: "4", amplitude: "0.3", phase: "0" });
  const [wavefieldData, setWavefieldData] = useState<WavefieldPoint[]>([]);

  const computeWavefield = useCallback((t: number) => {
    const L = boxLength[0];
    const numPoints = resolution[0];
    const points: WavefieldPoint[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const r = (i / numPoints) * L;
      const { real, imag } = calculateWavefield(r, t, eigenstates, L);
      const magnitude = Math.sqrt(real * real + imag * imag);
      const phase = Math.atan2(imag, real);

      points.push({
        r,
        realPart: real,
        imagPart: imag,
        magnitude,
        phase
      });
    }

    setWavefieldData(points);
    return points;
  }, [eigenstates, boxLength, resolution]);

  const drawWavefield = useCallback((points: WavefieldPoint[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const maxMag = Math.max(...points.map(p => p.magnitude), 0.001);
    const scale = (height * 0.4) / maxMag;

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = midY - p.realPart * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = midY - p.imagPart * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = midY - p.magnitude * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.font = '12px monospace';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('Re(Φ)', 10, 20);
    ctx.fillStyle = '#f472b6';
    ctx.fillText('Im(Φ)', 70, 20);
    ctx.fillStyle = '#a855f7';
    ctx.fillText('|Φ|', 130, 20);

    ctx.fillStyle = '#64748b';
    ctx.fillText(`t = ${time.toFixed(3)}`, width - 80, 20);
  }, [time]);

  useEffect(() => {
    const points = computeWavefield(time);
    drawWavefield(points);
  }, [time, computeWavefield, drawWavefield]);

  useEffect(() => {
    if (!isAnimating) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setTime(prev => prev + dt * timeScale[0]);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, timeScale]);

  const toggleAnimation = () => {
    setIsAnimating(prev => !prev);
  };

  const resetSimulation = () => {
    setIsAnimating(false);
    setTime(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const addEigenstate = () => {
    const n = parseInt(newState.n);
    const amplitude = parseFloat(newState.amplitude);
    const phase = parseFloat(newState.phase);

    if (isNaN(n) || n < 1 || isNaN(amplitude) || isNaN(phase)) return;
    if (eigenstates.some(s => s.n === n)) return;

    setEigenstates(prev => [...prev, { n, amplitude, phase }]);
    setNewState({ n: String(n + 1), amplitude: "0.3", phase: "0" });
  };

  const removeEigenstate = (n: number) => {
    setEigenstates(prev => prev.filter(s => s.n !== n));
  };

  const updateEigenstateAmplitude = (n: number, amplitude: number) => {
    setEigenstates(prev =>
      prev.map(s => (s.n === n ? { ...s, amplitude } : s))
    );
  };

  const calculateTotalProbability = () => {
    return eigenstates.reduce((sum, s) => sum + s.amplitude * s.amplitude, 0);
  };

  const PARTICLE_MASS = 1;

  const calculateExpectedEnergy = () => {
    const L = boxLength[0];
    const m = PARTICLE_MASS;
    let totalEnergy = 0;
    const normFactor = calculateTotalProbability();

    if (normFactor === 0) return 0;

    for (const state of eigenstates) {
      const E_n = (state.n * state.n * Math.PI * Math.PI * REDUCED_PLANCK * REDUCED_PLANCK) / (2 * m * L * L);
      const prob = (state.amplitude * state.amplitude) / normFactor;
      totalEnergy += prob * E_n;
    }

    return totalEnergy;
  };

  const isNormalized = () => {
    const total = calculateTotalProbability();
    return Math.abs(total - 1) < 0.01;
  };

  const normalizeAmplitudes = () => {
    const total = calculateTotalProbability();
    if (total === 0) return;
    const normFactor = Math.sqrt(total);
    setEigenstates(prev =>
      prev.map(s => ({ ...s, amplitude: s.amplitude / normFactor }))
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Waves className="w-10 h-10 text-purple-400 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent" data-testid="text-title">
              Wavefield Simulation
            </h1>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-4 inline-block mb-4">
            <div className="font-mono text-2xl text-white">
              Φ<sub>λ</sub>(r,t) = <span className="text-cyan-400">Σ</span><sub className="text-pink-400">n</sub> a<sub>n</sub> · ψ<sub>n</sub>(r) · e<sup className="text-purple-400">-iω<sub>n</sub>t</sup>
            </div>
          </div>
          <p className="text-xl text-purple-300 mb-2">
            Quantum eigenstate superposition visualization
          </p>
          <p className="text-gray-400 font-mono">
            Observe wave evolution through time-dependent phase factors
          </p>
        </div>

        <Tabs defaultValue="simulation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/50" data-testid="tabs-wavefield">
            <TabsTrigger value="simulation" data-testid="tab-simulation">Simulation</TabsTrigger>
            <TabsTrigger value="eigenstates" data-testid="tab-eigenstates">Eigenstates</TabsTrigger>
            <TabsTrigger value="theory" data-testid="tab-theory">Theory</TabsTrigger>
          </TabsList>

          <TabsContent value="simulation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-visualization">
                <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Wavefield Φ<sub>λ</sub>(r,t)
                  {isAnimating && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-2 animate-pulse">
                      EVOLVING
                    </Badge>
                  )}
                </h2>

                <div className="bg-slate-800 rounded-lg p-2 mb-4">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={300}
                    className="w-full rounded"
                    data-testid="canvas-wavefield"
                  />
                </div>

                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <Label className="text-gray-400 text-sm">Position (r)</Label>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0</span>
                      <span>L/2 = {(boxLength[0] / 2).toFixed(1)}</span>
                      <span>L = {boxLength[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    data-testid="button-toggle"
                    onClick={toggleAnimation}
                    className={isAnimating 
                      ? "flex-1 bg-amber-600 hover:bg-amber-500" 
                      : "flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                    }
                  >
                    {isAnimating ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isAnimating ? "Pause Evolution" : "Start Evolution"}
                  </Button>
                  <Button
                    data-testid="button-reset"
                    onClick={resetSimulation}
                    variant="outline"
                    className="border-slate-600"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-controls">
                <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Simulation Controls
                </h2>

                <div className="space-y-6">
                  <div>
                    <Label className="text-gray-300">Time Scale: {timeScale[0].toFixed(1)}x</Label>
                    <Slider
                      data-testid="slider-timescale"
                      value={timeScale}
                      onValueChange={setTimeScale}
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Box Length (L): {boxLength[0]}</Label>
                    <Slider
                      data-testid="slider-boxlength"
                      value={boxLength}
                      onValueChange={setBoxLength}
                      min={1}
                      max={20}
                      step={1}
                      className="mt-2"
                      disabled={isAnimating}
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Resolution: {resolution[0]} points</Label>
                    <Slider
                      data-testid="slider-resolution"
                      value={resolution}
                      onValueChange={setResolution}
                      min={50}
                      max={500}
                      step={50}
                      className="mt-2"
                      disabled={isAnimating}
                    />
                  </div>

                  <div className="border-t border-slate-700 pt-4">
                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Time</span>
                        <span className="text-white font-mono">{time.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Eigenstates</span>
                        <span className="text-cyan-400 font-mono">{eigenstates.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Σ|a<sub>n</sub>|²</span>
                        <span className={`font-mono ${isNormalized() ? 'text-green-400' : 'text-amber-400'}`}>
                          {calculateTotalProbability().toFixed(4)}
                          {isNormalized() ? ' ✓' : ' (not normalized)'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">⟨E⟩</span>
                        <span className="text-green-400 font-mono">{calculateExpectedEnergy().toExponential(3)} J</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="bg-slate-900/60 border-amber-500/30 p-6" data-testid="card-active-states">
              <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                <Sigma className="w-5 h-5" />
                Active Eigenstates in Superposition
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {eigenstates.map(state => {
                  const wavelengthNm = 380 + ((state.n % 10) / 10) * 400;
                  return (
                    <div
                      key={state.n}
                      className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
                      data-testid={`state-${state.n}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: wavelengthToColor(wavelengthNm) }}
                          />
                          <span className="text-white font-mono">n = {state.n}</span>
                        </div>
                        <button
                          onClick={() => removeEigenstate(state.n)}
                          className="text-gray-500 hover:text-red-400 text-sm"
                          data-testid={`remove-state-${state.n}`}
                        >
                          ×
                        </button>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">a<sub>{state.n}</sub></span>
                          <span className="text-cyan-400 font-mono">{state.amplitude.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">φ</span>
                          <span className="text-pink-400 font-mono">{(state.phase / Math.PI).toFixed(2)}π</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">|a|²</span>
                          <span className="text-purple-400 font-mono">{(state.amplitude * state.amplitude).toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="eigenstates" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/60 border-green-500/30 p-6" data-testid="card-add-state">
                <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                  <Atom className="w-5 h-5" />
                  Add Eigenstate
                </h2>

                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="font-mono text-center text-lg text-gray-300 mb-4">
                      ψ<sub>n</sub>(r) = √(2/L) · sin(nπr/L)
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-gray-400 text-sm">Quantum Number n</Label>
                        <Input
                          data-testid="input-n"
                          value={newState.n}
                          onChange={(e) => setNewState(prev => ({ ...prev, n: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white font-mono mt-1"
                          type="number"
                          min="1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400 text-sm">Amplitude a<sub>n</sub></Label>
                        <Input
                          data-testid="input-amplitude"
                          value={newState.amplitude}
                          onChange={(e) => setNewState(prev => ({ ...prev, amplitude: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white font-mono mt-1"
                          type="number"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400 text-sm">Phase φ (rad)</Label>
                        <Input
                          data-testid="input-phase"
                          value={newState.phase}
                          onChange={(e) => setNewState(prev => ({ ...prev, phase: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white font-mono mt-1"
                          type="number"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    data-testid="button-add-state"
                    onClick={addEigenstate}
                    className="w-full bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500"
                    disabled={eigenstates.some(s => s.n === parseInt(newState.n))}
                  >
                    <Sigma className="w-4 h-4 mr-2" />
                    Add to Superposition
                  </Button>

                  {eigenstates.some(s => s.n === parseInt(newState.n)) && (
                    <div className="text-amber-400 text-sm text-center">
                      State n = {newState.n} already exists in superposition
                    </div>
                  )}
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-modify-states">
                <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Modify Amplitudes
                </h2>

                <div className="space-y-4">
                  {eigenstates.map(state => (
                    <div key={state.n} className="bg-slate-800/50 rounded-lg p-3" data-testid={`modify-state-${state.n}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-mono">ψ<sub>{state.n}</sub>(r)</span>
                        <Badge className="bg-slate-700 text-gray-300">
                          ω<sub>{state.n}</sub> = {omega_n(state.n, boxLength[0]).toExponential(2)} rad/s
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm w-12">a<sub>{state.n}</sub></span>
                        <Slider
                          value={[state.amplitude]}
                          onValueChange={(v) => updateEigenstateAmplitude(state.n, v[0])}
                          min={0}
                          max={1}
                          step={0.01}
                          className="flex-1"
                        />
                        <span className="text-cyan-400 font-mono w-12 text-right">{state.amplitude.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}

                  {eigenstates.length === 0 && (
                    <div className="text-gray-500 text-center py-8">
                      No eigenstates configured. Add some from the left panel.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <Card className="bg-slate-900/60 border-amber-500/30 p-6" data-testid="card-presets">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-amber-400">Quick Presets</h3>
                <Button
                  data-testid="button-normalize"
                  onClick={normalizeAmplitudes}
                  variant="outline"
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                  disabled={isNormalized()}
                >
                  Normalize (Σ|a|²=1)
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  data-testid="preset-ground"
                  variant="outline"
                  className="border-slate-600"
                  onClick={() => setEigenstates([{ n: 1, amplitude: 1, phase: 0 }])}
                >
                  Ground State
                </Button>
                <Button
                  data-testid="preset-first"
                  variant="outline"
                  className="border-slate-600"
                  onClick={() => setEigenstates([{ n: 2, amplitude: 1, phase: 0 }])}
                >
                  First Excited
                </Button>
                <Button
                  data-testid="preset-superposition"
                  variant="outline"
                  className="border-slate-600"
                  onClick={() => setEigenstates([
                    { n: 1, amplitude: 0.707, phase: 0 },
                    { n: 2, amplitude: 0.707, phase: 0 }
                  ])}
                >
                  Equal Superposition
                </Button>
                <Button
                  data-testid="preset-wavepacket"
                  variant="outline"
                  className="border-slate-600"
                  onClick={() => setEigenstates([
                    { n: 3, amplitude: 0.2, phase: 0 },
                    { n: 4, amplitude: 0.4, phase: 0 },
                    { n: 5, amplitude: 0.6, phase: 0 },
                    { n: 6, amplitude: 0.4, phase: 0 },
                    { n: 7, amplitude: 0.2, phase: 0 }
                  ])}
                >
                  Wave Packet
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="theory" className="space-y-6">
            <Card className="bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-theory">
              <h2 className="text-xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Wavefield Eigenstate Expansion Theory
              </h2>

              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-lg p-6">
                  <h3 className="text-lg text-white mb-4">The Wavefield Equation</h3>
                  <div className="font-mono text-center text-2xl text-purple-400 mb-4">
                    Φ<sub>λ</sub>(r,t) = Σ<sub>n</sub> a<sub>n</sub> · ψ<sub>n</sub>(r) · e<sup>-iω<sub>n</sub>t</sup>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-cyan-400 font-mono">Φ<sub>λ</sub>(r,t)</span>
                        <span className="text-gray-300">Complete wavefield at position r and time t</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-pink-400 font-mono">a<sub>n</sub></span>
                        <span className="text-gray-300">Expansion coefficient (probability amplitude)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-green-400 font-mono">ψ<sub>n</sub>(r)</span>
                        <span className="text-gray-300">Spatial eigenfunction for state n</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-mono">e<sup>-iω<sub>n</sub>t</sup></span>
                        <span className="text-gray-300">Time evolution phase factor</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-400 font-mono">ω<sub>n</sub></span>
                        <span className="text-gray-300">Angular frequency = E<sub>n</sub>/ℏ</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-cyan-400 font-mono">Σ<sub>n</sub></span>
                        <span className="text-gray-300">Sum over all contributing eigenstates</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-green-400 font-semibold mb-3">Infinite Square Well Eigenfunctions</h4>
                    <div className="font-mono text-lg text-white text-center mb-3">
                      ψ<sub>n</sub>(r) = √(2/L) · sin(nπr/L)
                    </div>
                    <div className="text-gray-400 text-sm">
                      For a particle in a 1D box of length L, the eigenfunctions form
                      a complete orthonormal basis. Each state n has nodes at n-1 interior points.
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-amber-400 font-semibold mb-3">Energy Eigenvalues</h4>
                    <div className="font-mono text-lg text-white text-center mb-3">
                      E<sub>n</sub> = n²π²ℏ²/(2mL²)
                    </div>
                    <div className="text-gray-400 text-sm">
                      Energy is quantized and scales with n². Higher states oscillate faster
                      with frequency ω<sub>n</sub> = E<sub>n</sub>/ℏ.
                    </div>
                  </div>
                </div>

                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
                  <h4 className="text-purple-400 font-semibold mb-3">Connection to Lambda Boson Theory</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="font-mono text-xl text-cyan-400">E = hf</div>
                      <div className="text-gray-400 text-sm mt-1">Planck's quantum</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-xl text-orange-400">E = mc²</div>
                      <div className="text-gray-400 text-sm mt-1">Einstein's equivalence</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-xl text-green-400">Λ = hf/c²</div>
                      <div className="text-gray-400 text-sm mt-1">Lambda Boson mass</div>
                    </div>
                  </div>
                  <div className="mt-4 text-gray-300 text-sm text-center">
                    Each eigenstate n corresponds to a specific frequency ω<sub>n</sub>,
                    which determines its Lambda Boson mass-equivalent through Λ<sub>n</sub> = ℏω<sub>n</sub>/c².
                    The total wavefield represents a superposition of these quantum mass states.
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-cyan-400 font-semibold mb-3">Physical Constants</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-sm">
                    <div className="text-center">
                      <div className="text-gray-400">Planck constant</div>
                      <div className="text-white">h = {PLANCK_CONSTANT.toExponential(5)} J·s</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">Reduced Planck</div>
                      <div className="text-white">ℏ = {REDUCED_PLANCK.toExponential(5)} J·s</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">Speed of light</div>
                      <div className="text-white">c = {SPEED_OF_LIGHT.toLocaleString()} m/s</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
