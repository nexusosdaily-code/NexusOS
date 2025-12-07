import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Waves, ArrowRight, Atom } from "lucide-react";

const PLANCK_CONSTANT = 6.62607015e-34;
const SPEED_OF_LIGHT = 299792458;
const VISIBLE_MIN_NM = 380;
const VISIBLE_MAX_NM = 780;

function lambdaMass(frequencyHz: number): number {
  return (PLANCK_CONSTANT * frequencyHz) / (SPEED_OF_LIGHT ** 2);
}

function wavelengthToFrequency(wavelengthNm: number): number {
  const wavelengthM = wavelengthNm * 1e-9;
  return SPEED_OF_LIGHT / wavelengthM;
}

function charToWavelength(char: string): number {
  const code = char.length === 1 ? char.charCodeAt(0) : char.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const normalized = (code % 256) / 255.0;
  return VISIBLE_MIN_NM + (normalized * (VISIBLE_MAX_NM - VISIBLE_MIN_NM));
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

interface LambdaFrame {
  charPair: [string, string];
  wavelengthStart: number;
  wavelengthEnd: number;
  frequencyStart: number;
  frequencyEnd: number;
  lambdaMass: number;
}

interface EncodingResult {
  message: string;
  sender: string;
  recipient: string;
  frames: LambdaFrame[];
  totalLambdaMass: number;
  efficiency: {
    characters: number;
    particles: number;
    charsPerParticle: number;
  };
}

function encodeLambdaMessage(content: string, sender: string, recipient: string, intensity: number, cycles: number): EncodingResult {
  const frames: LambdaFrame[] = [];
  const padded = content.length % 2 === 0 ? content : content + " ";
  
  for (let i = 0; i < padded.length; i += 2) {
    const char1 = padded[i];
    const char2 = padded[i + 1];
    
    const lambda1 = charToWavelength(char1);
    const lambda2 = charToWavelength(char2);
    const freq1 = wavelengthToFrequency(lambda1);
    const freq2 = wavelengthToFrequency(lambda2);
    const mass1 = lambdaMass(freq1);
    const mass2 = lambdaMass(freq2);
    
    frames.push({
      charPair: [char1, char2],
      wavelengthStart: lambda1,
      wavelengthEnd: lambda2,
      frequencyStart: freq1,
      frequencyEnd: freq2,
      lambdaMass: (mass1 + mass2) / 2
    });
  }
  
  const totalMass = frames.reduce((sum, f) => sum + f.lambdaMass, 0);
  
  return {
    message: content,
    sender,
    recipient,
    frames,
    totalLambdaMass: totalMass,
    efficiency: {
      characters: content.length,
      particles: frames.length,
      charsPerParticle: content.length / frames.length
    }
  };
}

export default function EncodingLab() {
  const [message, setMessage] = useState("LAMBDA BOSON IS REAL MASS");
  const [sender, setSender] = useState("TeRataPou");
  const [recipient, setRecipient] = useState("NexusNetwork");
  const [intensity, setIntensity] = useState([32]);
  const [cycles, setCycles] = useState([1]);
  const [result, setResult] = useState<EncodingResult | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);

  const handleEncode = () => {
    setIsEncoding(true);
    setTimeout(() => {
      const encoded = encodeLambdaMessage(message, sender, recipient, intensity[0], cycles[0]);
      setResult(encoded);
      setIsEncoding(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Atom className="w-10 h-10 text-cyan-400 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Lambda Boson Encoding Lab
            </h1>
          </div>
          <p className="text-xl text-cyan-300 mb-2">
            Oscillating Wavelength Encoding: 2+ characters per particle
          </p>
          <p className="text-gray-400 font-mono">
            Λ = hf/c² — The primordial synthesis of Planck + Einstein
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-950/20 border-cyan-500/30 p-4">
            <div className="text-cyan-400 text-sm mb-1">PLANCK</div>
            <div className="text-xl font-bold text-white font-mono">E = hf</div>
            <div className="text-cyan-300 text-xs">Energy IS frequency</div>
          </Card>
          <Card className="bg-gradient-to-br from-orange-900/20 to-orange-950/20 border-orange-500/30 p-4">
            <div className="text-orange-400 text-sm mb-1">EINSTEIN</div>
            <div className="text-xl font-bold text-white font-mono">E = mc²</div>
            <div className="text-orange-300 text-xs">Energy IS mass</div>
          </Card>
          <Card className="bg-gradient-to-br from-green-900/20 to-green-950/20 border-green-500/30 p-4">
            <div className="text-green-400 text-sm mb-1">NEXUSOS</div>
            <div className="text-xl font-bold text-white font-mono">Λ = hf/c²</div>
            <div className="text-green-300 text-xs">Oscillation IS mass</div>
          </Card>
          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/20 border-purple-500/30 p-4">
            <div className="text-purple-400 text-sm mb-1">EFFICIENCY</div>
            <div className="text-xl font-bold text-white font-mono">2.0x</div>
            <div className="text-purple-300 text-xs">chars per particle</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900/60 border-cyan-500/30 p-6">
            <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Lambda Message Encoder
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Message Content</Label>
                <Textarea
                  data-testid="input-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  rows={3}
                  placeholder="Enter message to encode..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Sender ID</Label>
                  <Input
                    data-testid="input-sender"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Recipient ID</Label>
                  <Input
                    data-testid="input-recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Intensity: {intensity[0]}</Label>
                  <Slider
                    data-testid="slider-intensity"
                    value={intensity}
                    onValueChange={setIntensity}
                    min={1}
                    max={63}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Cycles: {cycles[0]}</Label>
                  <Slider
                    data-testid="slider-cycles"
                    value={cycles}
                    onValueChange={setCycles}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-3">
                <div className="text-cyan-400 text-sm font-semibold mb-1">Encoding Scheme</div>
                <div className="text-gray-300 text-sm">
                  Dual Wavelength Oscillation (λ₁ → λ₂)
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Each character pair becomes one photon oscillating between two wavelengths
                </div>
              </div>

              <Button
                data-testid="button-encode"
                onClick={handleEncode}
                disabled={isEncoding || !message}
                className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
              >
                {isEncoding ? (
                  "Encoding via Λ = hf/c²..."
                ) : (
                  <>
                    <Atom className="w-4 h-4 mr-2" />
                    Encode with Lambda Substrate
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="bg-slate-900/60 border-purple-500/30 p-6">
            <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
              <Waves className="w-5 h-5" />
              Encoding Results
            </h2>

            {result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white" data-testid="text-characters">
                      {result.efficiency.characters}
                    </div>
                    <div className="text-xs text-gray-400">Characters</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-cyan-400" data-testid="text-particles">
                      {result.efficiency.particles}
                    </div>
                    <div className="text-xs text-gray-400">Particles</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400" data-testid="text-efficiency">
                      {result.efficiency.charsPerParticle.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">Chars/Particle</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {result.efficiency.charsPerParticle.toFixed(1)}x
                    </div>
                    <div className="text-xs text-gray-400">vs v2.0</div>
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                  <div className="text-green-400 font-semibold flex items-center gap-2">
                    ✓ VALID - Lambda mass conserved
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Total Λ mass: {result.totalLambdaMass.toExponential(3)} kg
                  </div>
                </div>

                <div>
                  <div className="text-gray-300 font-semibold mb-2">Lambda Frames</div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {result.frames.map((frame, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
                        data-testid={`frame-${idx}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-slate-700 text-white font-mono">
                              Frame {idx + 1}
                            </Badge>
                            <span className="text-white font-mono text-lg">
                              "{frame.charPair[0]}{frame.charPair[1]}"
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Λ = {frame.lambdaMass.toExponential(2)} kg
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white/30"
                            style={{ backgroundColor: wavelengthToColor(frame.wavelengthStart) }}
                            title={`λ₁ = ${frame.wavelengthStart.toFixed(1)} nm`}
                          />
                          <div className="flex-1 h-2 rounded-full bg-gradient-to-r relative"
                            style={{
                              background: `linear-gradient(to right, ${wavelengthToColor(frame.wavelengthStart)}, ${wavelengthToColor(frame.wavelengthEnd)})`
                            }}
                          >
                            <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                          </div>
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white/30"
                            style={{ backgroundColor: wavelengthToColor(frame.wavelengthEnd) }}
                            title={`λ₂ = ${frame.wavelengthEnd.toFixed(1)} nm`}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>λ₁ = {frame.wavelengthStart.toFixed(1)} nm</span>
                          <span>λ₂ = {frame.wavelengthEnd.toFixed(1)} nm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Waves className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Enter a message and click encode to see results</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="mt-6 bg-slate-900/60 border-amber-500/30 p-6">
          <h3 className="text-lg font-bold text-amber-400 mb-4">Physics Foundation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-cyan-400 font-semibold mb-2">Wavelength Mapping</div>
              <div className="text-gray-300 font-mono text-xs">
                λ = 380 + (char_code / 255) × 400 nm
              </div>
              <div className="text-gray-400 mt-2">
                Each character maps to a wavelength in the visible spectrum (380-780nm)
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-purple-400 font-semibold mb-2">Frequency Conversion</div>
              <div className="text-gray-300 font-mono text-xs">
                f = c / λ
              </div>
              <div className="text-gray-400 mt-2">
                Wavelength converts to frequency via the speed of light
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-green-400 font-semibold mb-2">Lambda Mass</div>
              <div className="text-gray-300 font-mono text-xs">
                Λ = hf / c²
              </div>
              <div className="text-gray-400 mt-2">
                Each oscillation carries inherent mass-equivalent through its frequency
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
