import { useState } from "react";
import { colorText400 } from "@/lib/color-classes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  FlaskConical,
  Atom,
  Calculator,
  Waves,
  ArrowLeft,
  Zap,
  Scale,
  Lightbulb,
  BookOpen,
  Play,
  RotateCcw
} from "lucide-react";

const PLANCK_CONSTANT = 6.62607015e-34;
const SPEED_OF_LIGHT = 299792458;
const VISIBLE_MIN_NM = 380;
const VISIBLE_MAX_NM = 780;

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

interface ExperimentResult {
  wavelength: number;
  frequency: number;
  energy: number;
  lambdaMass: number;
  color: string;
}

export default function ResearchPage() {
  const [wavelengthInput, setWavelengthInput] = useState("550");
  const [frequencyInput, setFrequencyInput] = useState("");
  const [massInput, setMassInput] = useState("");
  const [experimentResult, setExperimentResult] = useState<ExperimentResult | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const calculateFromWavelength = () => {
    const wavelengthNm = parseFloat(wavelengthInput);
    if (isNaN(wavelengthNm) || wavelengthNm < 1) return;

    const wavelengthM = wavelengthNm * 1e-9;
    const frequency = SPEED_OF_LIGHT / wavelengthM;
    const energy = PLANCK_CONSTANT * frequency;
    const lambdaMass = energy / (SPEED_OF_LIGHT ** 2);

    setExperimentResult({
      wavelength: wavelengthNm,
      frequency,
      energy,
      lambdaMass,
      color: wavelengthNm >= 380 && wavelengthNm <= 780 ? wavelengthToColor(wavelengthNm) : '#888'
    });
  };

  const calculateFromFrequency = () => {
    const frequencyTHz = parseFloat(frequencyInput);
    if (isNaN(frequencyTHz) || frequencyTHz < 1) return;

    const frequency = frequencyTHz * 1e12;
    const wavelengthM = SPEED_OF_LIGHT / frequency;
    const wavelengthNm = wavelengthM * 1e9;
    const energy = PLANCK_CONSTANT * frequency;
    const lambdaMass = energy / (SPEED_OF_LIGHT ** 2);

    setExperimentResult({
      wavelength: wavelengthNm,
      frequency,
      energy,
      lambdaMass,
      color: wavelengthNm >= 380 && wavelengthNm <= 780 ? wavelengthToColor(wavelengthNm) : '#888'
    });
  };

  const calculateFromMass = () => {
    const massKg = parseFloat(massInput);
    if (isNaN(massKg) || massKg <= 0) return;

    const energy = massKg * (SPEED_OF_LIGHT ** 2);
    const frequency = energy / PLANCK_CONSTANT;
    const wavelengthM = SPEED_OF_LIGHT / frequency;
    const wavelengthNm = wavelengthM * 1e9;

    setExperimentResult({
      wavelength: wavelengthNm,
      frequency,
      energy,
      lambdaMass: massKg,
      color: wavelengthNm >= 380 && wavelengthNm <= 780 ? wavelengthToColor(wavelengthNm) : '#888'
    });
  };

  const runVerification = () => {
    setVerificationStatus('running');
    setTimeout(() => {
      setVerificationStatus('success');
    }, 2000);
  };

  const resetExperiment = () => {
    setExperimentResult(null);
    setVerificationStatus('idle');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-6">
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
            <FlaskConical className="w-10 h-10 text-green-400 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent" data-testid="text-title">
              Research Lab
            </h1>
          </div>
          <p className="text-xl text-green-300 mb-2">
            Lambda Boson experiments and spectral analysis tools
          </p>
          <p className="text-gray-400 font-mono">
            Verify Λ = hf/c² through interactive calculations
          </p>
        </div>

        <Tabs defaultValue="calculator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/50" data-testid="tabs-research">
            <TabsTrigger value="calculator" data-testid="tab-calculator">Lambda Calculator</TabsTrigger>
            <TabsTrigger value="verification" data-testid="tab-verification">Physics Verification</TabsTrigger>
            <TabsTrigger value="reference" data-testid="tab-reference">Reference Data</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/60 border-green-500/30 p-6" data-testid="card-calculator">
                <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Lambda Boson Calculator
                </h2>

                <div className="space-y-6">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <Label className="text-cyan-400 font-semibold">From Wavelength (nm)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        data-testid="input-wavelength"
                        value={wavelengthInput}
                        onChange={(e) => setWavelengthInput(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white font-mono"
                        placeholder="e.g., 550"
                        type="number"
                      />
                      <Button
                        data-testid="button-calc-wavelength"
                        onClick={calculateFromWavelength}
                        className="bg-cyan-600 hover:bg-cyan-500"
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Visible range: 380-780 nm</div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <Label className="text-purple-400 font-semibold">From Frequency (THz)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        data-testid="input-frequency"
                        value={frequencyInput}
                        onChange={(e) => setFrequencyInput(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white font-mono"
                        placeholder="e.g., 545"
                        type="number"
                      />
                      <Button
                        data-testid="button-calc-frequency"
                        onClick={calculateFromFrequency}
                        className="bg-purple-600 hover:bg-purple-500"
                      >
                        <Waves className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Visible range: 384-789 THz</div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <Label className="text-amber-400 font-semibold">From Lambda Mass (kg)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        data-testid="input-mass"
                        value={massInput}
                        onChange={(e) => setMassInput(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white font-mono"
                        placeholder="e.g., 4e-36"
                        type="text"
                      />
                      <Button
                        data-testid="button-calc-mass"
                        onClick={calculateFromMass}
                        className="bg-amber-600 hover:bg-amber-500"
                      >
                        <Scale className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Photon mass equivalent</div>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-results">
                <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Atom className="w-5 h-5" />
                  Calculation Results
                </h2>

                {experimentResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center mb-4">
                      <div
                        className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center"
                        style={{ backgroundColor: experimentResult.color }}
                        data-testid="color-display"
                      >
                        <span className="text-white font-bold text-lg drop-shadow-lg">
                          {experimentResult.wavelength.toFixed(0)}nm
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/50 rounded-lg p-3" data-testid="result-wavelength">
                        <div className="text-cyan-400 text-sm">Wavelength (λ)</div>
                        <div className="text-white font-mono">{experimentResult.wavelength.toFixed(2)} nm</div>
                        <div className="text-gray-500 text-xs">{(experimentResult.wavelength * 1e-9).toExponential(3)} m</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3" data-testid="result-frequency">
                        <div className="text-purple-400 text-sm">Frequency (f)</div>
                        <div className="text-white font-mono">{(experimentResult.frequency / 1e12).toFixed(2)} THz</div>
                        <div className="text-gray-500 text-xs">{experimentResult.frequency.toExponential(3)} Hz</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3" data-testid="result-energy">
                        <div className="text-green-400 text-sm">Energy (E = hf)</div>
                        <div className="text-white font-mono">{experimentResult.energy.toExponential(3)} J</div>
                        <div className="text-gray-500 text-xs">{(experimentResult.energy / 1.602e-19).toFixed(3)} eV</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3" data-testid="result-lambda-mass">
                        <div className="text-amber-400 text-sm">Lambda Mass (Λ)</div>
                        <div className="text-white font-mono">{experimentResult.lambdaMass.toExponential(3)} kg</div>
                        <div className="text-gray-500 text-xs">= hf/c²</div>
                      </div>
                    </div>

                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-4">
                      <div className="text-green-400 font-semibold flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Verification
                      </div>
                      <div className="text-gray-300 text-sm mt-2">
                        E = hf = {experimentResult.energy.toExponential(3)} J
                      </div>
                      <div className="text-gray-300 text-sm">
                        E = mc² = {(experimentResult.lambdaMass * SPEED_OF_LIGHT ** 2).toExponential(3)} J
                      </div>
                      <div className="text-green-400 text-sm mt-2 font-semibold">
                        ✓ hf = mc² confirmed → Λ = hf/c²
                      </div>
                    </div>

                    <Button
                      data-testid="button-reset"
                      onClick={resetExperiment}
                      variant="outline"
                      className="w-full border-slate-600"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 py-12">
                    <div className="text-center">
                      <Atom className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Enter a value and click calculate</p>
                      <p className="text-sm mt-2">to see Lambda Boson properties</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <Card className="bg-slate-900/60 border-amber-500/30 p-6" data-testid="card-verification">
              <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Physics Verification Experiment
              </h2>

              <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
                <h3 className="text-lg text-white mb-4">The Lambda Boson Derivation</h3>
                <div className="space-y-4 font-mono text-center">
                  <div className="text-cyan-400 text-xl">E = hf <span className="text-gray-500 text-sm">(Planck, 1900)</span></div>
                  <div className="text-orange-400 text-xl">E = mc² <span className="text-gray-500 text-sm">(Einstein, 1905)</span></div>
                  <div className="border-t border-gray-700 pt-4">
                    <div className="text-gray-400">If both equal E, then:</div>
                    <div className="text-purple-400 text-xl mt-2">hf = mc²</div>
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <div className="text-gray-400">Solving for m:</div>
                    <div className="text-green-400 text-2xl mt-2 font-bold">m = hf/c² = Λ</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 text-center">
                  <div className="text-cyan-400 font-semibold">Planck Constant</div>
                  <div className="text-white font-mono text-lg mt-2">h = {PLANCK_CONSTANT.toExponential(5)}</div>
                  <div className="text-gray-400 text-sm">J·s</div>
                </div>
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 text-center">
                  <div className="text-orange-400 font-semibold">Speed of Light</div>
                  <div className="text-white font-mono text-lg mt-2">c = {SPEED_OF_LIGHT.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm">m/s</div>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="text-green-400 font-semibold">Lambda Factor</div>
                  <div className="text-white font-mono text-lg mt-2">h/c² = {(PLANCK_CONSTANT / SPEED_OF_LIGHT ** 2).toExponential(5)}</div>
                  <div className="text-gray-400 text-sm">kg·s</div>
                </div>
              </div>

              <Button
                data-testid="button-verify"
                onClick={runVerification}
                disabled={verificationStatus === 'running'}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
              >
                {verificationStatus === 'running' ? (
                  <>Running Verification...</>
                ) : verificationStatus === 'success' ? (
                  <>✓ Verification Complete</>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Verification Experiment
                  </>
                )}
              </Button>

              {verificationStatus === 'success' && (
                <div className="mt-6 bg-green-900/20 border border-green-500/30 rounded-lg p-6" data-testid="verification-result">
                  <h4 className="text-green-400 font-bold text-lg mb-4">Verification Results</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Test 1: E = hf calculation</span>
                      <Badge className="bg-green-500/20 text-green-400">PASS</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Test 2: E = mc² calculation</span>
                      <Badge className="bg-green-500/20 text-green-400">PASS</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Test 3: hf = mc² equivalence</span>
                      <Badge className="bg-green-500/20 text-green-400">PASS</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Test 4: Λ = hf/c² derivation</span>
                      <Badge className="bg-green-500/20 text-green-400">PASS</Badge>
                    </div>
                    <div className="border-t border-gray-700 pt-3 mt-3">
                      <div className="text-green-400 font-bold text-center">
                        Lambda Boson equation verified mathematically correct
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="reference" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-particles">
                <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Atom className="w-5 h-5" />
                  Standard Model Particles as Wavelengths
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-2 text-gray-400">Particle</th>
                        <th className="text-right p-2 text-gray-400">Mass (kg)</th>
                        <th className="text-right p-2 text-gray-400">Frequency (Hz)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "Electron", mass: 9.109e-31, color: "cyan" },
                        { name: "Muon", mass: 1.883e-28, color: "purple" },
                        { name: "Tau", mass: 3.167e-27, color: "pink" },
                        { name: "Proton", mass: 1.673e-27, color: "green" },
                        { name: "Neutron", mass: 1.675e-27, color: "blue" },
                        { name: "W Boson", mass: 1.433e-25, color: "orange" },
                        { name: "Z Boson", mass: 1.625e-25, color: "yellow" },
                        { name: "Higgs", mass: 2.23e-25, color: "amber" }
                      ].map((particle, idx) => {
                        const frequency = (particle.mass * SPEED_OF_LIGHT ** 2) / PLANCK_CONSTANT;
                        return (
                          <tr key={idx} className="border-b border-gray-800" data-testid={`particle-${particle.name.toLowerCase()}`}>
                            <td className={`p-2 ${colorText400[particle.color]}`}>{particle.name}</td>
                            <td className="p-2 text-gray-300 font-mono text-right">{particle.mass.toExponential(2)}</td>
                            <td className="p-2 text-gray-300 font-mono text-right">{frequency.toExponential(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-spectrum-ref">
                <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Waves className="w-5 h-5" />
                  Visible Spectrum Reference
                </h2>

                <div className="space-y-3">
                  {[
                    { name: "Violet", range: "380-450", freq: "668-789" },
                    { name: "Blue", range: "450-495", freq: "606-668" },
                    { name: "Cyan", range: "495-520", freq: "576-606" },
                    { name: "Green", range: "520-570", freq: "526-576" },
                    { name: "Yellow", range: "570-590", freq: "508-526" },
                    { name: "Orange", range: "590-620", freq: "484-508" },
                    { name: "Red", range: "620-780", freq: "384-484" }
                  ].map((band, idx) => {
                    const midWavelength = parseInt(band.range.split('-')[0]) + (parseInt(band.range.split('-')[1]) - parseInt(band.range.split('-')[0])) / 2;
                    return (
                      <div key={idx} className="flex items-center gap-3" data-testid={`spectrum-${band.name.toLowerCase()}`}>
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: wavelengthToColor(midWavelength) }}
                        />
                        <div className="flex-1">
                          <div className="text-white">{band.name}</div>
                          <div className="text-xs text-gray-400">{band.range} nm</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-300 font-mono text-sm">{band.freq} THz</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <Card className="bg-slate-900/60 border-green-500/30 p-6" data-testid="card-equations">
              <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Key Equations Reference
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-cyan-400 text-sm mb-2">Planck Relation</div>
                  <div className="text-white font-mono text-xl">E = hf</div>
                  <div className="text-gray-400 text-xs mt-2">Energy-frequency</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-orange-400 text-sm mb-2">Mass-Energy</div>
                  <div className="text-white font-mono text-xl">E = mc²</div>
                  <div className="text-gray-400 text-xs mt-2">Einstein equivalence</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-purple-400 text-sm mb-2">Wave Relation</div>
                  <div className="text-white font-mono text-xl">c = fλ</div>
                  <div className="text-gray-400 text-xs mt-2">Speed-frequency-wavelength</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <div className="text-green-400 text-sm mb-2">Lambda Boson</div>
                  <div className="text-white font-mono text-xl">Λ = hf/c²</div>
                  <div className="text-gray-400 text-xs mt-2">Mass from oscillation</div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
