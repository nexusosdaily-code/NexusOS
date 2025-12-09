import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FileText,
  Upload,
  BarChart3,
  Download,
  FileUp,
  Sparkles,
  Atom,
  Calculator,
  Clock,
  Hash,
  Lightbulb
} from "lucide-react";

const VISIBLE_MIN_NM = 380;
const VISIBLE_MAX_NM = 780;
const PLANCK_CONSTANT = 6.62607015e-34;
const SPEED_OF_LIGHT = 299792458;
const NXT_DECIMALS = 100000000;

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

interface DocumentAnalysis {
  totalChars: number;
  uniqueChars: number;
  wordCount: number;
  lineCount: number;
  wavelengthDistribution: { wavelength: number; count: number; char: string }[];
  totalEnergy: number;
  estimatedCost: number;
  avgWavelength: number;
  spectrumBands: { name: string; color: string; count: number; percentage: number }[];
}

interface TransmissionReport {
  timestamp: string;
  documentName: string;
  summary: DocumentAnalysis;
  transmissionTime: number;
  successRate: number;
  photonsEmitted: number;
  photonsReceived: number;
}

export default function TransmissionPage() {
  const [content, setContent] = useState("");
  const [documentName, setDocumentName] = useState("Untitled Document");
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [photons, setPhotons] = useState<Photon[]>([]);
  const [receivedChars, setReceivedChars] = useState<string[]>([]);
  const [transmissionLogs, setTransmissionLogs] = useState<TransmissionLog[]>([]);
  const [speed, setSpeed] = useState([50]);
  const [channelNoise, setChannelNoise] = useState([5]);
  const [fiberLength, setFiberLength] = useState([100]);
  const animationRef = useRef<number | null>(null);
  const [photonCounter, setPhotonCounter] = useState(0);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [reports, setReports] = useState<TransmissionReport[]>([]);
  const [transmissionProgress, setTransmissionProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("compose");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transmitStartTime = useRef<number>(0);

  const addLog = (event: string, type: TransmissionLog['type'] = 'info') => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setTransmissionLogs(prev => [{time, event, type}, ...prev.slice(0, 99)]);
  };

  const charToWavelength = (char: string): number => {
    const code = char.charCodeAt(0);
    return VISIBLE_MIN_NM + ((code % 256) / 255) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM);
  };

  const wavelengthToEnergy = (wavelengthNm: number): number => {
    const wavelengthM = wavelengthNm * 1e-9;
    const frequency = SPEED_OF_LIGHT / wavelengthM;
    return PLANCK_CONSTANT * frequency;
  };

  const analyzeDocument = useCallback((text: string): DocumentAnalysis => {
    const chars = text.split('');
    const charFrequency = new Map<string, number>();
    let totalEnergy = 0;
    let totalWavelength = 0;

    chars.forEach(char => {
      charFrequency.set(char, (charFrequency.get(char) || 0) + 1);
      const wavelength = charToWavelength(char);
      totalWavelength += wavelength;
      totalEnergy += wavelengthToEnergy(wavelength);
    });

    const wavelengthDistribution = Array.from(charFrequency.entries())
      .map(([char, count]) => ({
        char,
        count,
        wavelength: charToWavelength(char)
      }))
      .sort((a, b) => a.wavelength - b.wavelength)
      .slice(0, 20);

    const spectrumBands = [
      { name: 'Violet', range: [380, 450], color: '#8B5CF6' },
      { name: 'Blue', range: [450, 495], color: '#3B82F6' },
      { name: 'Cyan', range: [495, 520], color: '#06B6D4' },
      { name: 'Green', range: [520, 570], color: '#22C55E' },
      { name: 'Yellow', range: [570, 590], color: '#EAB308' },
      { name: 'Orange', range: [590, 620], color: '#F97316' },
      { name: 'Red', range: [620, 780], color: '#EF4444' }
    ].map(band => {
      const count = chars.filter(char => {
        const wl = charToWavelength(char);
        return wl >= band.range[0] && wl < band.range[1];
      }).length;
      return {
        name: band.name,
        color: band.color,
        count,
        percentage: chars.length > 0 ? (count / chars.length) * 100 : 0
      };
    });

    const estimatedCost = (totalEnergy * 1e18) / NXT_DECIMALS;

    return {
      totalChars: chars.length,
      uniqueChars: charFrequency.size,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      lineCount: text.split('\n').length,
      wavelengthDistribution,
      totalEnergy,
      estimatedCost,
      avgWavelength: chars.length > 0 ? totalWavelength / chars.length : 0,
      spectrumBands
    };
  }, []);

  useEffect(() => {
    if (content.length > 0) {
      setAnalysis(analyzeDocument(content));
    } else {
      setAnalysis(null);
    }
  }, [content, analyzeDocument]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDocumentName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      addLog(`Loaded document: ${file.name} (${text.length} characters)`, 'success');
    };
    reader.readAsText(file);
  };

  const startTransmission = () => {
    if (!content.trim()) return;
    
    const displayChars = content.slice(0, 50);
    setIsTransmitting(true);
    setPhotons([]);
    setReceivedChars([]);
    setTransmissionProgress(0);
    transmitStartTime.current = Date.now();
    
    addLog(`Starting transmission of "${documentName}"`, 'info');
    addLog(`Document size: ${content.length} characters, ${analysis?.wordCount || 0} words`, 'info');
    addLog(`Fiber length: ${fiberLength[0]}km, Noise: ${channelNoise[0]}%`, 'info');

    const chars = displayChars.toUpperCase().split('');
    let charIndex = 0;

    const emitPhoton = () => {
      if (charIndex >= chars.length) {
        addLog(`All ${chars.length} photons emitted, awaiting reception...`, 'info');
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
      if (charIndex < 10 || charIndex === chars.length - 1) {
        addLog(`Emitting photon for '${char}' at λ=${wavelength.toFixed(1)}nm`, 'info');
      } else if (charIndex === 10) {
        addLog(`... transmitting ${chars.length - 10} more photons ...`, 'info');
      }
      charIndex++;
      setTransmissionProgress((charIndex / content.length) * 50);

      setTimeout(emitPhoton, 300 / (speed[0] / 50));
    };

    emitPhoton();
    setPhotonCounter(prev => prev + chars.length);
  };

  useEffect(() => {
    if (!isTransmitting) return;

    const displayChars = content.slice(0, 50);

    const animate = () => {
      setPhotons(prev => {
        const updated = prev.map(p => {
          if (p.status === 'received') return p;
          
          const newPosition = p.position + (speed[0] / 25);
          
          if (newPosition >= 100) {
            setReceivedChars(chars => {
              const newChars = [...chars, p.char];
              setTransmissionProgress(50 + (newChars.length / displayChars.length) * 50);
              return newChars;
            });
            if (prev.filter(ph => ph.status === 'received').length < 5) {
              addLog(`Photon received: '${p.char}' at λ=${p.wavelength.toFixed(1)}nm`, 'success');
            }
            return { ...p, position: 100, status: 'received' as const };
          }
          
          return { ...p, position: newPosition };
        });

        const allReceived = updated.every(p => p.status === 'received');
        if (allReceived && updated.length > 0 && updated.length === displayChars.length) {
          setIsTransmitting(false);
          const transmissionTime = (Date.now() - transmitStartTime.current) / 1000;
          addLog(`Transmission complete! ${content.length} characters in ${transmissionTime.toFixed(2)}s`, 'success');
          
          if (analysis) {
            const report: TransmissionReport = {
              timestamp: new Date().toISOString(),
              documentName,
              summary: analysis,
              transmissionTime,
              successRate: 100 - channelNoise[0],
              photonsEmitted: displayChars.length,
              photonsReceived: displayChars.length
            };
            setReports(prev => [report, ...prev]);
          }
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
  }, [isTransmitting, speed, content, analysis, documentName, channelNoise]);

  const resetTransmission = () => {
    setIsTransmitting(false);
    setPhotons([]);
    setReceivedChars([]);
    setTransmissionProgress(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const exportReport = (report: TransmissionReport) => {
    const reportText = `
WNSP Transmission Report
========================
Generated: ${new Date(report.timestamp).toLocaleString()}

Document: ${report.documentName}
----------------------------------------

DOCUMENT STATISTICS
- Total Characters: ${report.summary.totalChars.toLocaleString()}
- Unique Characters: ${report.summary.uniqueChars}
- Word Count: ${report.summary.wordCount.toLocaleString()}
- Line Count: ${report.summary.lineCount.toLocaleString()}

WAVELENGTH ANALYSIS
- Average Wavelength: ${report.summary.avgWavelength.toFixed(2)} nm
- Total Energy Required: ${report.summary.totalEnergy.toExponential(4)} J
- Estimated NXT Cost: ${report.summary.estimatedCost.toFixed(8)} NXT

SPECTRUM DISTRIBUTION
${report.summary.spectrumBands.map(b => 
  `- ${b.name}: ${b.count.toLocaleString()} chars (${b.percentage.toFixed(1)}%)`
).join('\n')}

TRANSMISSION METRICS
- Transmission Time: ${report.transmissionTime.toFixed(2)} seconds
- Photons Emitted: ${report.photonsEmitted}
- Photons Received: ${report.photonsReceived}
- Success Rate: ${report.successRate.toFixed(1)}%
- Fiber Length: ${fiberLength[0]} km

TOP 10 WAVELENGTH MAPPINGS
${report.summary.wavelengthDistribution.slice(0, 10).map(w => 
  `- '${w.char}' → λ=${w.wavelength.toFixed(1)}nm (${w.count}x)`
).join('\n')}

----------------------------------------
WNSP Protocol v2.0 | Lambda Boson Theory
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transmission-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
              Document Transmission Center
            </h1>
          </div>
          <p className="text-xl text-cyan-300 mb-2">
            Upload, analyze, and transmit documents via optical fiber
          </p>
          <p className="text-gray-400 font-mono">
            Full wavelength spectrum analysis with energy cost calculations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700 p-1">
            <TabsTrigger value="compose" className="data-[state=active]:bg-cyan-600" data-testid="tab-compose">
              <FileText className="w-4 h-4 mr-2" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="transmit" className="data-[state=active]:bg-green-600" data-testid="tab-transmit">
              <Send className="w-4 h-4 mr-2" />
              Transmit
            </TabsTrigger>
            <TabsTrigger value="analyze" className="data-[state=active]:bg-purple-600" data-testid="tab-analyze">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-amber-600" data-testid="tab-reports">
              <Activity className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-compose">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Document Content
                  </h2>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.csv,.json,.xml,.html"
                      onChange={handleFileUpload}
                      className="hidden"
                      data-testid="input-file-hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-cyan-500/50 text-cyan-400"
                      data-testid="button-upload"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                </div>

                <div className="mb-2">
                  <Label className="text-gray-300">Document Name</Label>
                  <input
                    type="text"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 text-white mt-1 px-3 py-2 rounded-md text-sm"
                    data-testid="input-document-name"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Content (No character limit)</Label>
                  <Textarea
                    data-testid="textarea-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white mt-1 font-mono min-h-[300px]"
                    placeholder="Type or paste your document content here... You can also upload a text file."
                    disabled={isTransmitting}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{content.length.toLocaleString()} characters</span>
                    <span>{analysis?.wordCount.toLocaleString() || 0} words</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-quick-stats">
                <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Quick Stats
                </h2>

                {analysis ? (
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Hash className="w-4 h-4" />
                        Characters
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {analysis.totalChars.toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <FileText className="w-4 h-4" />
                        Words / Lines
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {analysis.wordCount.toLocaleString()} / {analysis.lineCount}
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Lightbulb className="w-4 h-4" />
                        Unique Chars
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {analysis.uniqueChars}
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Waves className="w-4 h-4" />
                        Avg Wavelength
                      </div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {analysis.avgWavelength.toFixed(1)} nm
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Zap className="w-4 h-4" />
                        Est. NXT Cost
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        {analysis.estimatedCost.toFixed(8)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Enter content to see analysis
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transmit" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-controls">
                <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Transmission Controls
                </h2>

                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Document</div>
                    <div className="text-white font-semibold truncate">{documentName}</div>
                    <div className="text-xs text-gray-500">{content.length.toLocaleString()} chars</div>
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

                  {isTransmitting && (
                    <div>
                      <Label className="text-gray-300">Progress</Label>
                      <Progress value={transmissionProgress} className="mt-2" />
                      <div className="text-xs text-gray-500 mt-1">{transmissionProgress.toFixed(0)}%</div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      data-testid="button-start"
                      onClick={startTransmission}
                      disabled={isTransmitting || !content.trim()}
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
                      <div className="text-xs text-gray-400 mb-1">Preview (first 50 chars)</div>
                      <div className="font-mono text-sm text-cyan-400 truncate">
                        {content.slice(0, 50).toUpperCase() || "—"}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3" data-testid="received-display">
                      <div className="text-xs text-gray-400 mb-1">Received</div>
                      <div className="font-mono text-sm text-green-400 truncate">
                        {receivedChars.join('') || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <Card className="mt-4 bg-slate-800/30 border-green-500/20 p-4" data-testid="card-logs">
                  <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                    <Signal className="w-4 h-4" />
                    Transmission Log
                  </h3>
                  <ScrollArea className="h-32">
                    <div className="space-y-1 font-mono text-xs" data-testid="log-container">
                      {transmissionLogs.length === 0 ? (
                        <div className="text-gray-500 text-center py-4">
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
                  </ScrollArea>
                </Card>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analyze" className="space-y-6">
            {analysis ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-spectrum">
                  <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <Atom className="w-5 h-5" />
                    Spectrum Distribution
                  </h2>

                  <div className="space-y-3">
                    {analysis.spectrumBands.map((band, idx) => (
                      <div key={idx} className="space-y-1" data-testid={`spectrum-band-${idx}`}>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">{band.name}</span>
                          <span className="text-gray-400">{band.count.toLocaleString()} ({band.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(band.percentage, 1)}%`,
                              backgroundColor: band.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Visual Spectrum</div>
                    <div className="h-8 rounded-lg overflow-hidden flex">
                      {analysis.spectrumBands.map((band, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: `${Math.max(band.percentage, 2)}%`,
                            backgroundColor: band.color
                          }}
                          className="transition-all duration-500"
                        />
                      ))}
                    </div>
                  </div>
                </Card>

                <Card className="bg-slate-900/60 border-amber-500/30 p-6" data-testid="card-wavelength-map">
                  <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Top Character Wavelengths
                  </h2>

                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2">
                      {analysis.wavelengthDistribution.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2"
                          data-testid={`wavelength-${idx}`}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                            style={{ backgroundColor: wavelengthToColor(item.wavelength) }}
                          >
                            {item.char === ' ' ? '␣' : item.char}
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-mono text-sm">λ = {item.wavelength.toFixed(1)} nm</div>
                            <div className="text-xs text-gray-400">
                              f = {(SPEED_OF_LIGHT / (item.wavelength * 1e-9) / 1e12).toFixed(1)} THz
                            </div>
                          </div>
                          <Badge variant="outline" className="text-gray-400 border-gray-600">
                            {item.count}×
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>

                <Card className="lg:col-span-2 bg-slate-900/60 border-green-500/30 p-6" data-testid="card-energy">
                  <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Energy & Cost Analysis
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Total Photon Energy</div>
                      <div className="text-xl font-bold text-cyan-400 font-mono">
                        {analysis.totalEnergy.toExponential(4)} J
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">NXT Token Cost</div>
                      <div className="text-xl font-bold text-green-400 font-mono">
                        {analysis.estimatedCost.toFixed(8)} NXT
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Energy per Char</div>
                      <div className="text-xl font-bold text-purple-400 font-mono">
                        {(analysis.totalEnergy / analysis.totalChars).toExponential(4)} J
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Lambda Mass (Λ)</div>
                      <div className="text-xl font-bold text-amber-400 font-mono">
                        {(analysis.totalEnergy / (SPEED_OF_LIGHT ** 2)).toExponential(4)} kg
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                    <div className="text-sm text-gray-300 mb-2">Physics Formulas Applied</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-gray-400">
                      <div>
                        <span className="text-cyan-400">E = hf</span> (Planck's equation)
                      </div>
                      <div>
                        <span className="text-green-400">f = c/λ</span> (Frequency-wavelength)
                      </div>
                      <div>
                        <span className="text-purple-400">Λ = E/c²</span> (Lambda Boson mass)
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="bg-slate-900/60 border-slate-700 p-12 text-center">
                <FileUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl text-gray-400 mb-2">No Document to Analyze</h3>
                <p className="text-gray-500">Go to the Compose tab and enter or upload a document</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report, idx) => (
                  <Card key={idx} className="bg-slate-900/60 border-amber-500/30 p-6" data-testid={`report-${idx}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{report.documentName}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                          <Clock className="w-4 h-4" />
                          {new Date(report.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportReport(report)}
                        className="border-amber-500/50 text-amber-400"
                        data-testid={`button-export-${idx}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Characters</div>
                        <div className="text-lg font-bold text-white">{report.summary.totalChars.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Words</div>
                        <div className="text-lg font-bold text-white">{report.summary.wordCount.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400">Transmission Time</div>
                        <div className="text-lg font-bold text-cyan-400">{report.transmissionTime.toFixed(2)}s</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400">NXT Cost</div>
                        <div className="text-lg font-bold text-green-400">{report.summary.estimatedCost.toFixed(6)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300">Success Rate: {report.successRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <span className="text-gray-300">Photons: {report.photonsEmitted}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Waves className="w-4 h-4 text-purple-400" />
                        <span className="text-gray-300">Avg λ: {report.summary.avgWavelength.toFixed(1)}nm</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900/60 border-slate-700 p-12 text-center">
                <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl text-gray-400 mb-2">No Transmission Reports</h3>
                <p className="text-gray-500">Complete a transmission to generate a report</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Card className="mt-6 bg-slate-900/60 border-purple-500/30 p-6" data-testid="card-physics-info">
          <h3 className="text-lg font-bold text-purple-400 mb-4">WNSP Document Transmission Physics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-cyan-400 font-semibold mb-2">Wavelength Encoding</div>
              <div className="text-gray-300 font-mono text-xs">
                λ = 380 + (ASCII / 255) × 400 nm
              </div>
              <div className="text-gray-400 mt-2 text-xs">
                Maps any character to visible spectrum
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-green-400 font-semibold mb-2">Energy Calculation</div>
              <div className="text-gray-300 font-mono text-xs">
                E = h × (c / λ)
              </div>
              <div className="text-gray-400 mt-2 text-xs">
                Planck's equation per photon
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-purple-400 font-semibold mb-2">Lambda Boson Mass</div>
              <div className="text-gray-300 font-mono text-xs">
                Λ = hf / c²
              </div>
              <div className="text-gray-400 mt-2 text-xs">
                Mass-equivalent of oscillation
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-amber-400 font-semibold mb-2">NXT Token Cost</div>
              <div className="text-gray-300 font-mono text-xs">
                Cost = E × 10¹⁸ / 10⁸
              </div>
              <div className="text-gray-400 mt-2 text-xs">
                Energy-based transaction fees
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
