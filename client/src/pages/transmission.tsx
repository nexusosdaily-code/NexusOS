import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Link } from "wouter";
import {
  Radio,
  Waves,
  Zap,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Signal,
  Activity,
  Send,
  CheckCircle,
  Circle,
  ArrowRight
} from "lucide-react";

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

interface Photon {
  id: number;
  wavelength: number;
  position: number;
  char: string;
  status: 'transmitting' | 'received';
}

interface TransmissionLog {
  time: string;
  event: string;
  type: 'info' | 'success' | 'warning';
}

export default function TransmissionPage() {
  const [message, setMessage] = useState("HELLO");
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [photons, setPhotons] = useState<Photon[]>([]);
  const [receivedChars, setReceivedChars] = useState<string[]>([]);
  const [transmissionLogs, setTransmissionLogs] = useState<TransmissionLog[]>([]);
  const [speed, setSpeed] = useState([50]);
  const [channelNoise, setChannelNoise] = useState([5]);
  const [fiberLength, setFiberLength] = useState([100]);
  const animationRef = useRef<number | null>(null);
  const [photonCounter, setPhotonCounter] = useState(0);

  const addLog = (event: string, type: TransmissionLog['type'] = 'info') => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setTransmissionLogs(prev => [{time, event, type}, ...prev.slice(0, 19)]);
  };

  const charToWavelength = (char: string): number => {
    const code = char.charCodeAt(0);
    return VISIBLE_MIN_NM + ((code % 256) / 255) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM);
  };

  const startTransmission = () => {
    if (!message.trim()) return;
    
    setIsTransmitting(true);
    setPhotons([]);
    setReceivedChars([]);
    setTransmissionLogs([]);
    addLog(`Starting transmission of "${message}"`, 'info');
    addLog(`Fiber length: ${fiberLength[0]}km, Noise: ${channelNoise[0]}%`, 'info');

    const chars = message.toUpperCase().split('');
    let charIndex = 0;

    const emitPhoton = () => {
      if (charIndex >= chars.length) {
        addLog('All photons emitted, awaiting reception...', 'info');
        return;
      }

      const char = chars[charIndex];
      const wavelength = charToWavelength(char);
      const newPhoton: Photon = {
        id: photonCounter + charIndex,
        wavelength,
        position: 0,
        char,
        status: 'transmitting'
      };

      setPhotons(prev => [...prev, newPhoton]);
      addLog(`Emitting photon for '${char}' at λ=${wavelength.toFixed(1)}nm`, 'info');
      charIndex++;

      setTimeout(emitPhoton, 500 / (speed[0] / 50));
    };

    emitPhoton();
    setPhotonCounter(prev => prev + chars.length);
  };

  useEffect(() => {
    if (!isTransmitting) return;

    const animate = () => {
      setPhotons(prev => {
        const updated = prev.map(p => {
          if (p.status === 'received') return p;
          
          const newPosition = p.position + (speed[0] / 25);
          
          if (newPosition >= 100) {
            setReceivedChars(chars => [...chars, p.char]);
            addLog(`Photon received: '${p.char}' at λ=${p.wavelength.toFixed(1)}nm`, 'success');
            return { ...p, position: 100, status: 'received' as const };
          }
          
          return { ...p, position: newPosition };
        });

        const allReceived = updated.every(p => p.status === 'received');
        if (allReceived && updated.length > 0 && updated.length === message.length) {
          setIsTransmitting(false);
          addLog(`Transmission complete! Received: "${message.toUpperCase()}"`, 'success');
        }

        return updated;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isTransmitting, speed, message]);

  const resetTransmission = () => {
    setIsTransmitting(false);
    setPhotons([]);
    setReceivedChars([]);
    setTransmissionLogs([]);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
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
            <Radio className="w-10 h-10 text-cyan-400 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-purple-400 bg-clip-text text-transparent" data-testid="text-title">
              Transmission Simulation
            </h1>
          </div>
          <p className="text-xl text-cyan-300 mb-2">
            Fiber optic light path simulation with wavelength encoding
          </p>
          <p className="text-gray-400 font-mono">
            Watch photons travel through the optical fiber channel
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-controls">
            <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Transmission Controls
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Message to Transmit</Label>
                <Input
                  data-testid="input-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 20))}
                  className="bg-slate-800 border-slate-600 text-white mt-1 font-mono"
                  placeholder="Enter message..."
                  disabled={isTransmitting}
                  maxLength={20}
                />
                <div className="text-xs text-gray-500 mt-1">{message.length}/20 characters</div>
              </div>

              <div>
                <Label className="text-gray-300">Transmission Speed: {speed[0]}%</Label>
                <Slider
                  data-testid="slider-speed"
                  value={speed}
                  onValueChange={setSpeed}
                  min={10}
                  max={100}
                  step={10}
                  className="mt-2"
                  disabled={isTransmitting}
                />
              </div>

              <div>
                <Label className="text-gray-300">Fiber Length: {fiberLength[0]}km</Label>
                <Slider
                  data-testid="slider-fiber"
                  value={fiberLength}
                  onValueChange={setFiberLength}
                  min={10}
                  max={500}
                  step={10}
                  className="mt-2"
                  disabled={isTransmitting}
                />
              </div>

              <div>
                <Label className="text-gray-300">Channel Noise: {channelNoise[0]}%</Label>
                <Slider
                  data-testid="slider-noise"
                  value={channelNoise}
                  onValueChange={setChannelNoise}
                  min={0}
                  max={30}
                  step={1}
                  className="mt-2"
                  disabled={isTransmitting}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  data-testid="button-start"
                  onClick={startTransmission}
                  disabled={isTransmitting || !message.trim()}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-green-600 hover:from-cyan-500 hover:to-green-500"
                >
                  {isTransmitting ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isTransmitting ? "Transmitting..." : "Start"}
                </Button>
                <Button
                  data-testid="button-reset"
                  onClick={resetTransmission}
                  variant="outline"
                  className="border-slate-600"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-fiber">
            <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
              <Waves className="w-5 h-5" />
              Optical Fiber Channel
              {isTransmitting && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-2 animate-pulse">
                  ACTIVE
                </Badge>
              )}
            </h2>

            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-lg bg-cyan-900/50 border-2 border-cyan-500 flex items-center justify-center" data-testid="transmitter">
                    <Send className="w-8 h-8 text-cyan-400" />
                  </div>
                  <span className="text-xs text-cyan-400 mt-1">TX</span>
                </div>

                <div className="flex-1 relative h-24 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden" data-testid="fiber-channel">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-green-500/10" />
                  
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-8 relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-700/50 to-slate-700/50 rounded-full mx-4" />
                      
                      {photons.map(photon => (
                        <div
                          key={photon.id}
                          className="absolute top-1/2 -translate-y-1/2 transition-all duration-100"
                          style={{ left: `${4 + (photon.position * 0.92)}%` }}
                          data-testid={`photon-${photon.id}`}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
                            style={{
                              backgroundColor: wavelengthToColor(photon.wavelength),
                              boxShadow: `0 0 20px ${wavelengthToColor(photon.wavelength)}`
                            }}
                          >
                            {photon.char}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs text-gray-500">
                    <span>0 km</span>
                    <span>{Math.round(fiberLength[0] / 2)} km</span>
                    <span>{fiberLength[0]} km</span>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-lg bg-green-900/50 border-2 border-green-500 flex items-center justify-center" data-testid="receiver">
                    <Signal className="w-8 h-8 text-green-400" />
                  </div>
                  <span className="text-xs text-green-400 mt-1">RX</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-800/50 rounded-lg p-3" data-testid="sent-display">
                  <div className="text-xs text-gray-400 mb-1">Sent Message</div>
                  <div className="font-mono text-lg text-cyan-400">
                    {message.toUpperCase() || "—"}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3" data-testid="received-display">
                  <div className="text-xs text-gray-400 mb-1">Received Message</div>
                  <div className="font-mono text-lg text-green-400">
                    {receivedChars.join('') || "—"}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900/60 border-amber-500/30 p-6" data-testid="card-wavelength-legend">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Wavelength Legend
            </h3>

            <div className="space-y-2">
              {message.toUpperCase().split('').slice(0, 10).map((char, idx) => {
                const wavelength = charToWavelength(char);
                const isReceived = idx < receivedChars.length;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2"
                    data-testid={`legend-${idx}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: wavelengthToColor(wavelength) }}
                    >
                      {char}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-mono">λ = {wavelength.toFixed(1)} nm</div>
                      <div className="text-xs text-gray-400">
                        f = {(299792458 / (wavelength * 1e-9) / 1e12).toFixed(1)} THz
                      </div>
                    </div>
                    <div>
                      {isReceived ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                  </div>
                );
              })}
              {message.length > 10 && (
                <div className="text-center text-gray-500 text-sm">
                  + {message.length - 10} more characters
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-slate-900/60 border-green-500/30 p-6" data-testid="card-logs">
            <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
              <Signal className="w-5 h-5" />
              Transmission Log
            </h3>

            <div className="h-64 overflow-y-auto space-y-1 font-mono text-xs" data-testid="log-container">
              {transmissionLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No transmission activity yet
                </div>
              ) : (
                transmissionLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 py-1 px-2 rounded ${
                      log.type === 'success' ? 'bg-green-900/20 text-green-400' :
                      log.type === 'warning' ? 'bg-yellow-900/20 text-yellow-400' :
                      'text-gray-400'
                    }`}
                    data-testid={`log-${idx}`}
                  >
                    <span className="text-gray-500">[{log.time}]</span>
                    <span>{log.event}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="mt-6 bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-physics-info">
          <h3 className="text-lg font-bold text-purple-400 mb-4">Optical Transmission Physics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-cyan-400 font-semibold mb-2">Wavelength Encoding</div>
              <div className="text-gray-300 font-mono text-xs">
                λ = 380 + (ASCII / 255) × 400 nm
              </div>
              <div className="text-gray-400 mt-2">
                Each character maps to a unique wavelength in the visible spectrum
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-green-400 font-semibold mb-2">Fiber Optic Propagation</div>
              <div className="text-gray-300 font-mono text-xs">
                v = c / n ≈ 200,000 km/s
              </div>
              <div className="text-gray-400 mt-2">
                Light travels at ~2/3 the speed of light through glass fiber
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-purple-400 font-semibold mb-2">WDM Multiplexing</div>
              <div className="text-gray-300 font-mono text-xs">
                256 channels × 8 OAM modes
              </div>
              <div className="text-gray-400 mt-2">
                Multiple wavelengths transmitted simultaneously through single fiber
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
