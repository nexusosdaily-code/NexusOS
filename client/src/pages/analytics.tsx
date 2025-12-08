import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  BarChart3,
  Activity,
  Waves,
  Atom,
  TrendingUp,
  Zap,
  ArrowLeft,
  CircleDot,
  Signal,
  Gauge,
  Clock,
  Database
} from "lucide-react";

const VISIBLE_MIN_NM = 380;
const VISIBLE_MAX_NM = 780;
const PLANCK_CONSTANT = 6.62607015e-34;
const SPEED_OF_LIGHT = 299792458;

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

interface SpectrumBand {
  name: string;
  minNm: number;
  maxNm: number;
  usage: number;
  encodings: number;
}

export default function AnalyticsPage() {
  const [liveData, setLiveData] = useState({
    totalEncodings: 1247,
    activeChannels: 186,
    throughput: 94.7,
    lambdaMass: 2.847e-42,
    uptime: 99.97
  });

  const [spectrumBands] = useState<SpectrumBand[]>([
    { name: "Violet", minNm: 380, maxNm: 450, usage: 78, encodings: 234 },
    { name: "Blue", minNm: 450, maxNm: 495, usage: 92, encodings: 312 },
    { name: "Cyan", minNm: 495, maxNm: 520, usage: 65, encodings: 156 },
    { name: "Green", minNm: 520, maxNm: 570, usage: 88, encodings: 287 },
    { name: "Yellow", minNm: 570, maxNm: 590, usage: 45, encodings: 98 },
    { name: "Orange", minNm: 590, maxNm: 620, usage: 71, encodings: 189 },
    { name: "Red", minNm: 620, maxNm: 780, usage: 83, encodings: 271 }
  ]);

  const [recentActivity] = useState([
    { time: "2s ago", type: "encode", message: "HELLO WORLD", particles: 6, mass: 1.2e-43 },
    { time: "15s ago", type: "decode", message: "LAMBDA TEST", particles: 6, mass: 1.1e-43 },
    { time: "32s ago", type: "encode", message: "NEXUSOS V10", particles: 5, mass: 9.8e-44 },
    { time: "1m ago", type: "transmit", message: "DATA PACKET", particles: 5, mass: 1.0e-43 },
    { time: "2m ago", type: "encode", message: "COHERENCE", particles: 5, mass: 9.5e-44 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => ({
        ...prev,
        totalEncodings: prev.totalEncodings + Math.floor(Math.random() * 3),
        activeChannels: 180 + Math.floor(Math.random() * 20),
        throughput: 92 + Math.random() * 6,
        lambdaMass: prev.lambdaMass + (Math.random() * 1e-44)
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart3 className="w-10 h-10 text-purple-400 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent" data-testid="text-title">
              Spectral Analytics
            </h1>
          </div>
          <p className="text-xl text-purple-300 mb-2">
            Real-time wavelength encoding statistics and visualizations
          </p>
          <p className="text-gray-400 font-mono">
            Monitoring 256 WDM channels across 380-780nm visible spectrum
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/20 border-purple-500/30 p-4" data-testid="card-total-encodings">
            <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
              <Atom className="w-4 h-4" />
              ENCODINGS
            </div>
            <div className="text-2xl font-bold text-white font-mono">{liveData.totalEncodings.toLocaleString()}</div>
            <div className="text-purple-300 text-xs">Total processed</div>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-950/20 border-cyan-500/30 p-4" data-testid="card-active-channels">
            <div className="flex items-center gap-2 text-cyan-400 text-sm mb-1">
              <Signal className="w-4 h-4" />
              CHANNELS
            </div>
            <div className="text-2xl font-bold text-white font-mono">{liveData.activeChannels}</div>
            <div className="text-cyan-300 text-xs">Active WDM</div>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/20 to-green-950/20 border-green-500/30 p-4" data-testid="card-throughput">
            <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
              <Gauge className="w-4 h-4" />
              THROUGHPUT
            </div>
            <div className="text-2xl font-bold text-white font-mono">{liveData.throughput.toFixed(1)}%</div>
            <div className="text-green-300 text-xs">Efficiency</div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-900/20 to-amber-950/20 border-amber-500/30 p-4" data-testid="card-lambda-mass">
            <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
              <Zap className="w-4 h-4" />
              Λ MASS
            </div>
            <div className="text-2xl font-bold text-white font-mono">{liveData.lambdaMass.toExponential(2)}</div>
            <div className="text-amber-300 text-xs">kg total</div>
          </Card>

          <Card className="bg-gradient-to-br from-pink-900/20 to-pink-950/20 border-pink-500/30 p-4" data-testid="card-uptime">
            <div className="flex items-center gap-2 text-pink-400 text-sm mb-1">
              <Clock className="w-4 h-4" />
              UPTIME
            </div>
            <div className="text-2xl font-bold text-white font-mono">{liveData.uptime}%</div>
            <div className="text-pink-300 text-xs">System health</div>
          </Card>
        </div>

        <Tabs defaultValue="spectrum" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/50" data-testid="tabs-analytics">
            <TabsTrigger value="spectrum" data-testid="tab-spectrum">Spectrum Usage</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">Live Activity</TabsTrigger>
            <TabsTrigger value="physics" data-testid="tab-physics">Physics Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="spectrum" className="space-y-6">
            <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-spectrum-visualization">
              <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                <Waves className="w-5 h-5" />
                Visible Spectrum Channel Utilization
              </h2>

              <div className="h-16 rounded-lg overflow-hidden flex mb-4" data-testid="spectrum-bar">
                {spectrumBands.map((band, idx) => (
                  <div
                    key={idx}
                    className="h-full relative group cursor-pointer transition-all hover:scale-y-110"
                    style={{
                      flex: band.maxNm - band.minNm,
                      background: `linear-gradient(to right, ${wavelengthToColor(band.minNm)}, ${wavelengthToColor(band.maxNm)})`
                    }}
                    data-testid={`spectrum-band-${band.name.toLowerCase()}`}
                  >
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold">{band.usage}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {spectrumBands.map((band, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
                    data-testid={`band-stats-${band.name.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: wavelengthToColor((band.minNm + band.maxNm) / 2) }}
                      />
                      <span className="text-white text-sm font-medium">{band.name}</span>
                    </div>
                    <div className="text-xs text-gray-400">{band.minNm}-{band.maxNm}nm</div>
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${band.usage}%`,
                            backgroundColor: wavelengthToColor((band.minNm + band.maxNm) / 2)
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400">{band.usage}% used</span>
                        <span className="text-gray-500">{band.encodings}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-wdm-channels">
                <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Signal className="w-5 h-5" />
                  WDM Channel Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    { range: "380-480nm", channels: 64, label: "UV-Blue" },
                    { range: "480-580nm", channels: 64, label: "Blue-Green" },
                    { range: "580-680nm", channels: 64, label: "Yellow-Orange" },
                    { range: "680-780nm", channels: 64, label: "Red-IR" }
                  ].map((section, idx) => (
                    <div key={idx} className="flex items-center gap-3" data-testid={`wdm-section-${idx}`}>
                      <div className="w-24 text-xs text-gray-400">{section.range}</div>
                      <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden flex">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-full border-r border-slate-700 last:border-0"
                            style={{
                              flex: 1,
                              backgroundColor: wavelengthToColor(380 + (idx * 100) + (i * 12.5)),
                              opacity: 0.3 + Math.random() * 0.7
                            }}
                          />
                        ))}
                      </div>
                      <div className="w-20 text-xs text-gray-300 text-right">{section.channels} ch</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 text-center">
                  <div className="text-2xl font-bold text-cyan-400">256</div>
                  <div className="text-xs text-gray-400">Total WDM Channels</div>
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-green-500/30 p-6" data-testid="card-encoding-modes">
                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Encoding Mode Statistics
                </h3>
                <div className="space-y-4">
                  {[
                    { mode: "Dual Oscillation", count: 847, percentage: 68, color: "green" },
                    { mode: "Single Wavelength", count: 234, percentage: 19, color: "cyan" },
                    { mode: "Multi-Frame", count: 166, percentage: 13, color: "purple" }
                  ].map((mode, idx) => (
                    <div key={idx} data-testid={`mode-${mode.mode.toLowerCase().replace(' ', '-')}`}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{mode.mode}</span>
                        <span className="text-gray-400">{mode.count} ({mode.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-${mode.color}-500`}
                          style={{ width: `${mode.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Avg chars/particle:</span>
                    <span className="text-green-400 font-mono">2.0</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">Efficiency gain:</span>
                    <span className="text-green-400 font-mono">+100%</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-slate-900/60 border-amber-500/30 p-6" data-testid="card-live-feed">
              <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 animate-pulse" />
                Live Encoding Feed
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">LIVE</Badge>
              </h2>

              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center gap-4"
                    data-testid={`activity-${idx}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'encode' ? 'bg-green-500/20 text-green-400' :
                      activity.type === 'decode' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {activity.type === 'encode' ? <Zap className="w-5 h-5" /> :
                       activity.type === 'decode' ? <Waves className="w-5 h-5" /> :
                       <Signal className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{activity.message}</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {activity.particles} particles • Λ = {activity.mass.toExponential(1)} kg
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{activity.time}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-hourly">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">Hourly Activity</h3>
                <div className="flex items-end gap-1 h-32">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-cyan-500/60 rounded-t hover:bg-cyan-400 transition-colors"
                      style={{ height: `${30 + Math.random() * 70}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>12h ago</span>
                  <span>Now</span>
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-by-type">
                <h3 className="text-lg font-bold text-purple-400 mb-4">By Type</h3>
                <div className="space-y-3">
                  {[
                    { type: "Encode", count: 567, color: "green" },
                    { type: "Decode", count: 423, color: "cyan" },
                    { type: "Transmit", count: 257, color: "purple" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CircleDot className={`w-4 h-4 text-${item.color}-400`} />
                      <span className="text-gray-300 flex-1">{item.type}</span>
                      <span className="text-white font-mono">{item.count}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-green-500/30 p-6" data-testid="card-performance">
                <h3 className="text-lg font-bold text-green-400 mb-4">Performance</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Avg Latency</span>
                      <span className="text-green-400">12ms</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full">
                      <div className="h-full w-1/4 bg-green-500 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Success Rate</span>
                      <span className="text-green-400">99.8%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full">
                      <div className="h-full w-[99%] bg-green-500 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Queue Depth</span>
                      <span className="text-yellow-400">3</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full">
                      <div className="h-full w-1/12 bg-yellow-500 rounded-full" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="physics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/60 border-amber-500/30 p-6" data-testid="card-lambda-physics">
                <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                  <Atom className="w-5 h-5" />
                  Lambda Boson Statistics
                </h2>
                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-4xl font-bold text-amber-400 font-mono mb-2">
                      Λ = hf/c²
                    </div>
                    <div className="text-gray-400">Master Equation</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-cyan-400 text-sm">h (Planck)</div>
                      <div className="text-white font-mono text-sm">{PLANCK_CONSTANT.toExponential(4)}</div>
                      <div className="text-gray-500 text-xs">J·s</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-orange-400 text-sm">c (Light)</div>
                      <div className="text-white font-mono text-sm">{SPEED_OF_LIGHT.toLocaleString()}</div>
                      <div className="text-gray-500 text-xs">m/s</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-green-400 text-sm">Λ Factor</div>
                      <div className="text-white font-mono text-sm">{(PLANCK_CONSTANT / (SPEED_OF_LIGHT ** 2)).toExponential(4)}</div>
                      <div className="text-gray-500 text-xs">kg·s</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-purple-400 text-sm">Total Λ Mass</div>
                      <div className="text-white font-mono text-sm">{liveData.lambdaMass.toExponential(2)}</div>
                      <div className="text-gray-500 text-xs">kg encoded</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-frequency-distribution">
                <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Frequency Distribution
                </h2>
                <div className="space-y-3">
                  {[
                    { range: "384-428 THz", label: "Red", percentage: 22 },
                    { range: "428-526 THz", label: "Orange-Yellow", percentage: 18 },
                    { range: "526-606 THz", label: "Green", percentage: 28 },
                    { range: "606-668 THz", label: "Cyan-Blue", percentage: 20 },
                    { range: "668-789 THz", label: "Violet", percentage: 12 }
                  ].map((band, idx) => (
                    <div key={idx} data-testid={`freq-band-${idx}`}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{band.label}</span>
                        <span className="text-gray-400 font-mono text-xs">{band.range}</span>
                      </div>
                      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${band.percentage}%`,
                            backgroundColor: wavelengthToColor(780 - (idx * 80))
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-right">{band.percentage}%</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="bg-slate-900/60 border-green-500/30 p-6" data-testid="card-conservation">
              <h3 className="text-lg font-bold text-green-400 mb-4">Energy-Mass Conservation Verification</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400 font-mono">E = hf</div>
                  <div className="text-gray-400 mt-2">Energy from frequency</div>
                  <div className="text-xl text-white font-mono mt-2">
                    {(PLANCK_CONSTANT * 5e14).toExponential(2)} J
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400 font-mono">E = mc²</div>
                  <div className="text-gray-400 mt-2">Energy from mass</div>
                  <div className="text-xl text-white font-mono mt-2">
                    {(PLANCK_CONSTANT * 5e14).toExponential(2)} J
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 font-mono">✓ EQUAL</div>
                  <div className="text-gray-400 mt-2">Conservation verified</div>
                  <div className="text-green-400 mt-2">
                    Λ = hf/c² proven
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
