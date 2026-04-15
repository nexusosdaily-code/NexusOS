import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { getAuthHeaders } from "@/lib/queryClient";
import {
  Radio, Waves, Zap, ArrowLeft, Play, Pause, RotateCcw,
  Signal, Activity, Send, CheckCircle, Circle, FileText,
  Upload, BarChart3, Download, FileUp, Sparkles, Atom,
  Calculator, Clock, Hash, Lightbulb, Database, MessageSquare,
  Wallet, Globe, Network, TrendingUp, Eye, Film, AlertCircle
} from "lucide-react";

const VISIBLE_MIN_NM = 380;
const VISIBLE_MAX_NM = 780;
const PLANCK_CONSTANT = 6.62607015e-34;
const SPEED_OF_LIGHT = 299792458;
const NXT_DECIMALS = 100000000;

function wavelengthToColor(wavelengthNm: number): string {
  let r = 0, g = 0, b = 0;
  if (wavelengthNm >= 380 && wavelengthNm < 440) { r = -(wavelengthNm - 440) / 60; b = 1; }
  else if (wavelengthNm >= 440 && wavelengthNm < 490) { g = (wavelengthNm - 440) / 50; b = 1; }
  else if (wavelengthNm >= 490 && wavelengthNm < 510) { g = 1; b = -(wavelengthNm - 510) / 20; }
  else if (wavelengthNm >= 510 && wavelengthNm < 580) { r = (wavelengthNm - 510) / 70; g = 1; }
  else if (wavelengthNm >= 580 && wavelengthNm < 645) { r = 1; g = -(wavelengthNm - 645) / 65; }
  else if (wavelengthNm >= 645 && wavelengthNm <= 780) { r = 1; }
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

interface Photon { id: number; wavelength: number; position: number; char: string; status: 'transmitting' | 'received'; }
interface TransmissionLog { time: string; event: string; type: 'info' | 'success' | 'warning'; }
interface DocumentAnalysis {
  totalChars: number; uniqueChars: number; wordCount: number; lineCount: number;
  wavelengthDistribution: { wavelength: number; count: number; char: string }[];
  totalEnergy: number; estimatedCost: number; avgWavelength: number;
  spectrumBands: { name: string; color: string; count: number; percentage: number }[];
}
interface TransmissionReport {
  timestamp: string; documentName: string; summary: DocumentAnalysis;
  transmissionTime: number; successRate: number; photonsEmitted: number; photonsReceived: number;
  spectralRecord?: any; ordinal?: { units: string; nxt: string }; busSignal?: boolean;
}

export default function TransmissionPage() {
  const token = localStorage.getItem("auth_token") || "";
  const authHeaders = getAuthHeaders();

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

  // ── New integrated state ──────────────────────────────────────────────────
  const [realSpectral, setRealSpectral] = useState<any>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [ordinalReceipt, setOrdinalReceipt] = useState<{ units: string; nxt: string; psi: string; wavelength: number } | null>(null);
  const [storedRecord, setStoredRecord] = useState<any>(null);
  const [isStoring, setIsStoring] = useState(false);
  const [isSendingBus, setIsSendingBus] = useState(false);
  const [busSignalSent, setBusSignalSent] = useState(false);
  const [lastTransmitFreq, setLastTransmitFreq] = useState<number>(5.45e14);

  // ── Video / binary file state ─────────────────────────────────────────────
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadResult, setVideoUploadResult] = useState<any>(null);

  // ── Live data from backend ────────────────────────────────────────────────
  const { data: walletData } = useQuery<any>({
    queryKey: ["/api/wallet/balance"],
    refetchInterval: 30_000,
  });

  const { data: treasuryData, refetch: refetchTreasury } = useQuery<any>({
    queryKey: ["/api/ordinals/registry"],
    refetchInterval: 20_000,
  });

  const { data: spectralDB, refetch: refetchDB } = useQuery<any>({
    queryKey: ["/api/spectral-db?limit=8&sort=newest"],
    refetchInterval: 15_000,
  });

  const { data: busData } = useQuery<any>({
    queryKey: ["/api/agent-bus/status"],
    refetchInterval: 10_000,
  });

  const { data: receiptsData, refetch: refetchReceipts } = useQuery<any>({
    queryKey: ["/api/p2p/receipts?limit=20"],
    refetchInterval: 8_000,
  });

  const walletBalance = walletData?.balance
    ? (parseInt(walletData.balance) / 1e8).toFixed(4)
    : null;
  const treasuryTotal = treasuryData?.totalTreasuryDeposits
    ? (treasuryData.totalTreasuryDeposits / 1e8).toFixed(4)
    : null;

  // ── Encode document name via real CE→SE API ───────────────────────────────
  const encodeViaWNSP = useCallback(async (label: string) => {
    if (!label.trim()) return;
    setIsEncoding(true);
    try {
      const res = await fetch("/api/spectral/encode", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ text: label }),
      });
      if (res.ok) {
        const data = await res.json();
        setRealSpectral(data);
        if (data.frequency_hz) setLastTransmitFreq(parseFloat(data.frequency_hz));
        addLog(`Real CE→SE: λ=${parseFloat(data.wavelength_mid_nm ?? 550).toFixed(2)}nm ${data.psi_channel ?? ""} — Λ=${parseFloat(data.lambda_mass_kg ?? 0).toExponential(3)} kg`, 'success');
      }
    } catch { /* server may be starting */ }
    finally { setIsEncoding(false); }
  }, []);

  // Auto-encode when document name changes (debounced)
  useEffect(() => {
    if (!documentName.trim()) return;
    const t = setTimeout(() => encodeViaWNSP(documentName), 800);
    return () => clearTimeout(t);
  }, [documentName, encodeViaWNSP]);

  const addLog = (event: string, type: TransmissionLog['type'] = 'info') => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setTransmissionLogs(prev => [{ time, event, type }, ...prev.slice(0, 99)]);
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
    let totalEnergy = 0, totalWavelength = 0;
    chars.forEach(char => {
      charFrequency.set(char, (charFrequency.get(char) || 0) + 1);
      const wavelength = charToWavelength(char);
      totalWavelength += wavelength;
      totalEnergy += wavelengthToEnergy(wavelength);
    });
    const wavelengthDistribution = Array.from(charFrequency.entries())
      .map(([char, count]) => ({ char, count, wavelength: charToWavelength(char) }))
      .sort((a, b) => a.wavelength - b.wavelength).slice(0, 20);
    const spectrumBands = [
      { name: 'Violet', range: [380, 450], color: '#8B5CF6' },
      { name: 'Blue', range: [450, 495], color: '#3B82F6' },
      { name: 'Cyan', range: [495, 520], color: '#06B6D4' },
      { name: 'Green', range: [520, 570], color: '#22C55E' },
      { name: 'Yellow', range: [570, 590], color: '#EAB308' },
      { name: 'Orange', range: [590, 620], color: '#F97316' },
      { name: 'Red', range: [620, 780], color: '#EF4444' }
    ].map(band => {
      const count = chars.filter(char => { const wl = charToWavelength(char); return wl >= band.range[0] && wl < band.range[1]; }).length;
      return { name: band.name, color: band.color, count, percentage: chars.length > 0 ? (count / chars.length) * 100 : 0 };
    });
    return {
      totalChars: chars.length, uniqueChars: charFrequency.size,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      lineCount: text.split('\n').length, wavelengthDistribution,
      totalEnergy, estimatedCost: (totalEnergy * 1e18) / NXT_DECIMALS,
      avgWavelength: chars.length > 0 ? totalWavelength / chars.length : 0, spectrumBands,
    };
  }, []);

  useEffect(() => {
    if (content.length > 0) setAnalysis(analyzeDocument(content));
    else setAnalysis(null);
  }, [content, analyzeDocument]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const isBinary =
      file.type.startsWith("video/") ||
      file.type.startsWith("audio/") ||
      file.type.startsWith("image/") ||
      /\.(mp4|webm|mov|avi|mkv|gif|png|jpg|jpeg|pdf|zip|gz)$/i.test(file.name);

    if (isBinary) {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoPreviewUrl(url);
      setIsVideoMode(true);
      setDocumentName(file.name);
      setContent("");
      setVideoUploadResult(null);
      addLog(`Binary file loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.type || "unknown type"})`, 'success');
      addLog(`Use "Transmit Video" to broadcast via P2P spectral channel`, 'info');
      return;
    }

    // Text / document path — safe to read as text
    setIsVideoMode(false);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setDocumentName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      addLog(`Loaded: ${file.name} (${text.length} chars)`, 'success');
    };
    reader.readAsText(file);
  };

  const transmitVideo = async () => {
    if (!videoFile) return;
    setIsUploadingVideo(true);
    setVideoUploadResult(null);
    const psi = realSpectral?.psi_channel ?? "Ψ(0,0,H)";
    addLog(`▶ Video transmission started: "${documentName}"`, 'info');
    addLog(`Spectral channel: ${psi} · binary P2P upload`, 'info');
    try {
      const form = new FormData();
      form.append("file", videoFile);
      form.append("title", documentName);
      form.append("description", `P2P spectral transmission via ${psi}`);
      const res = await fetch("/api/spectral-workspace/video", {
        method: "POST",
        headers: { Authorization: authHeaders.Authorization ?? "" },
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setVideoUploadResult(data);
        const resolvedPsi = data.spectral?.psi_channel ?? data.record?.psiChannel ?? psi;
        const resolvedNm  = data.spectral?.wavelength_mid_nm ?? parseFloat(data.record?.wavelengthNm ?? "550");
        addLog(`✅ Video transmitted: ${resolvedPsi} · λ=${resolvedNm.toFixed(2)}nm`, 'success');
        addLog(`Spectral DB record: ${data.record?.id ?? "stored"}`, 'success');
        sendBusSignal("TRANSMIT_START", resolvedPsi, false).catch(() => {});
      } else {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        addLog(`Upload error: ${err.error}`, 'warning');
      }
    } catch (e: any) {
      addLog(`Transmission error: ${e.message}`, 'warning');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const startTransmission = () => {
    if (!content.trim()) return;
    const displayChars = content.slice(0, 50);
    setIsTransmitting(true);
    setPhotons([]);
    setReceivedChars([]);
    setTransmissionProgress(0);
    setOrdinalReceipt(null);
    setStoredRecord(null);
    setBusSignalSent(false);
    transmitStartTime.current = Date.now();

    const psi = realSpectral?.psi_channel ?? "Ψ(0,0,H)";
    const nm = parseFloat(realSpectral?.wavelength_mid_nm ?? "550");
    addLog(`▶ Transmission started: "${documentName}"`, 'info');
    addLog(`Spectral channel: ${psi} λ=${nm.toFixed(2)}nm`, 'info');
    addLog(`Fiber: ${fiberLength[0]}km · Noise: ${channelNoise[0]}% · Λ=hf/c²`, 'info');

    const chars = displayChars.toUpperCase().split('');
    let charIndex = 0;
    const emitPhoton = () => {
      if (charIndex >= chars.length) { addLog(`All ${chars.length} photons emitted`, 'info'); return; }
      const char = chars[charIndex];
      const wavelength = charToWavelength(char);
      setPhotons(prev => [...prev, { id: photonCounter + charIndex, wavelength, position: 0, char, status: 'transmitting' }]);
      if (charIndex < 5 || charIndex === chars.length - 1)
        addLog(`Photon '${char}' → λ=${wavelength.toFixed(1)}nm`, 'info');
      else if (charIndex === 5)
        addLog(`... ${chars.length - 5} more photons in flight ...`, 'info');
      charIndex++;
      setTransmissionProgress((charIndex / content.length) * 50);
      setTimeout(emitPhoton, 300 / (speed[0] / 50));
    };
    emitPhoton();
    setPhotonCounter(prev => prev + chars.length);

    // Signal agent bus: TRANSMIT started
    sendBusSignal("TRANSMIT_START", psi, false).catch(() => {});
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
            if (prev.filter(ph => ph.status === 'received').length < 3)
              addLog(`✓ Received '${p.char}' λ=${p.wavelength.toFixed(1)}nm`, 'success');
            return { ...p, position: 100, status: 'received' as const };
          }
          return { ...p, position: newPosition };
        });
        const allReceived = updated.every(p => p.status === 'received');
        if (allReceived && updated.length > 0 && updated.length === displayChars.length) {
          setIsTransmitting(false);
          const transmissionTime = (Date.now() - transmitStartTime.current) / 1000;
          addLog(`✅ Transmission complete! ${content.length} chars in ${transmissionTime.toFixed(2)}s`, 'success');
          if (analysis) {
            const freq = lastTransmitFreq;
            const nm = realSpectral?.wavelength_mid_nm ?? analysis.avgWavelength;
            const psi = realSpectral?.psi_channel ?? "Ψ(0,0,H)";
            const band = realSpectral?.band ?? "CORE";

            // Record TRANSMIT ordinal to treasury
            recordTransmitOrdinal(freq, nm, psi, band).then(ord => {
              if (ord) {
                setOrdinalReceipt({ units: ord.units, nxt: ord.nxt, psi, wavelength: parseFloat(String(nm)) });
                refetchTreasury();
                addLog(`💎 Ordinal: ${ord.units} NXT units → Orbital Treasury`, 'success');
              }
            });

            setReports(prev => [{
              timestamp: new Date().toISOString(), documentName, summary: analysis,
              transmissionTime, successRate: 100 - channelNoise[0],
              photonsEmitted: displayChars.length, photonsReceived: displayChars.length,
            }, ...prev]);
          }
        }
        return updated;
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isTransmitting, speed, content, analysis, documentName, channelNoise, realSpectral, lastTransmitFreq]);

  const recordTransmitOrdinal = async (freqHz: number, wavelengthNm: number | string, psiChannel: string, band: string) => {
    try {
      const res = await fetch("/api/transmit/ordinal", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ freqHz, wavelengthNm: parseFloat(String(wavelengthNm)), psiChannel, band, label: documentName }),
      });
      if (res.ok) { const d = await res.json(); return d.ordinal; }
    } catch { }
    return null;
  };

  const storeInSpectralDB = async () => {
    if (!content.trim()) return;
    setIsStoring(true);
    try {
      const res = await fetch("/api/spectral-db", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          label: documentName,
          content: content.slice(0, 2000),
          data: { source: "p2p_transmission", chars: content.length, avgWavelength: analysis?.avgWavelength, transmittedAt: new Date().toISOString() },
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setStoredRecord(d.record);
        addLog(`📦 Stored in Spectral DB: ${d.record.psiChannel} λ=${parseFloat(d.record.wavelengthNm).toFixed(2)}nm`, 'success');
        if (d.ordinal) addLog(`💎 STORE ordinal: ${d.ordinal.units} NXT units → Treasury`, 'success');
        refetchDB();
        refetchTreasury();
      }
    } catch (e: any) { addLog(`DB store failed: ${e.message}`, 'warning'); }
    finally { setIsStoring(false); }
  };

  const sendBusSignal = async (msgType: string, psiChannel: string, isManual = true) => {
    if (isManual) setIsSendingBus(true);
    try {
      const res = await fetch("/api/agent-bus/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          src: "p2p_transmission", dst: "kernel",
          payload: `${msgType}[${psiChannel}]: "${documentName}" ${content.length}chars`,
          priority: 3,
        }),
      });
      if (res.ok) {
        if (isManual) { setBusSignalSent(true); addLog(`📡 Agent bus signal sent → kernel`, 'success'); }
      }
    } catch { }
    finally { if (isManual) setIsSendingBus(false); }
  };

  const resetTransmission = () => {
    setIsTransmitting(false);
    setPhotons([]);
    setReceivedChars([]);
    setTransmissionProgress(0);
    setOrdinalReceipt(null);
    setStoredRecord(null);
    setBusSignalSent(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const exportReport = (report: TransmissionReport) => {
    const text = `WNSP Transmission Report\n========================\nGenerated: ${new Date(report.timestamp).toLocaleString()}\n\nDocument: ${report.documentName}\nCharacters: ${report.summary.totalChars}\nWords: ${report.summary.wordCount}\nAvg Wavelength: ${report.summary.avgWavelength.toFixed(2)}nm\nTotal Energy: ${report.summary.totalEnergy.toExponential(4)} J\nTransmission Time: ${report.transmissionTime.toFixed(2)}s\nOrdinal: ${report.ordinal?.units ?? "—"} NXT units\nSpectral Record: ${report.spectralRecord?.psiChannel ?? "—"}\n\nWNSP Protocol · Λ=hf/c²`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `transmission-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const realNm = realSpectral ? parseFloat(realSpectral.wavelength_mid_nm ?? 550) : null;
  const realColor = realNm ? wavelengthToColor(realNm) : "#06b6d4";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="button-home">
              <ArrowLeft className="w-4 h-4 mr-2" /> Home
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {walletBalance && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-950/30 text-xs">
                <Wallet className="w-3 h-3 text-green-400" />
                <span className="text-green-400 font-bold">{walletBalance}</span>
                <span className="text-green-400/50">NXT</span>
              </div>
            )}
            {treasuryTotal && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30 text-xs">
                <Globe className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400 font-bold">{treasuryTotal}</span>
                <span className="text-amber-400/50">NXT treasury</span>
              </div>
            )}
            <Link href="/ordinal-registry">
              <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-400/60 hover:text-amber-400 text-xs h-7">
                <TrendingUp className="w-3 h-3 mr-1" /> Ordinal Registry
              </Button>
            </Link>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-purple-400 bg-clip-text text-transparent" data-testid="text-title">
              Spectral P2P Transmission
            </h1>
          </div>
          <p className="text-gray-400 text-sm font-mono">
            Every transmission encodes to a wavelength address · Ordinals flow to Orbital Treasury · Λ=hf/c²
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700 p-1">
            <TabsTrigger value="compose" className="data-[state=active]:bg-cyan-600" data-testid="tab-compose">
              <FileText className="w-4 h-4 mr-1.5" /> Compose
            </TabsTrigger>
            <TabsTrigger value="transmit" className="data-[state=active]:bg-green-600" data-testid="tab-transmit">
              <Send className="w-4 h-4 mr-1.5" /> Transmit
            </TabsTrigger>
            <TabsTrigger value="analyze" className="data-[state=active]:bg-purple-600" data-testid="tab-analyze">
              <BarChart3 className="w-4 h-4 mr-1.5" /> Analysis
            </TabsTrigger>
            <TabsTrigger value="network" className="data-[state=active]:bg-amber-600" data-testid="tab-network">
              <Network className="w-4 h-4 mr-1.5" /> Network
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-rose-600" data-testid="tab-reports">
              <Activity className="w-4 h-4 mr-1.5" /> Reports
            </TabsTrigger>
          </TabsList>

          {/* ── COMPOSE ───────────────────────────────────────────────────── */}
          <TabsContent value="compose" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 bg-slate-900/60 border-cyan-500/30 p-5" data-testid="card-compose">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Document
                  </h2>
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.xml,.html,video/*,.mp4,.webm,.mov,.avi,.mkv,.gif" onChange={handleFileUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-cyan-500/50 text-cyan-400 h-7 text-xs" data-testid="button-upload">
                      <Upload className="w-3 h-3 mr-1" /> Upload
                    </Button>
                  </div>
                </div>
                <div className="mb-3">
                  <Label className="text-gray-400 text-xs">Document Name (determines spectral channel)</Label>
                  <input
                    type="text" value={documentName} onChange={(e) => setDocumentName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 text-white mt-1 px-3 py-2 rounded-md text-sm"
                    data-testid="input-document-name"
                  />
                </div>
                {isVideoMode && videoPreviewUrl ? (
                  <div data-testid="video-preview-panel">
                    <Label className="text-gray-400 text-xs flex items-center gap-1.5 mb-2">
                      <Film className="w-3 h-3" /> Video Preview
                    </Label>
                    <div className="rounded-lg overflow-hidden bg-black border border-cyan-500/30 mb-3">
                      {videoFile?.type === "image/gif" || videoFile?.name.endsWith(".gif") ? (
                        <img src={videoPreviewUrl} alt={documentName} className="w-full max-h-64 object-contain" />
                      ) : (
                        <video
                          src={videoPreviewUrl}
                          controls
                          className="w-full max-h-64"
                          data-testid="video-player"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div className="bg-slate-800/70 rounded p-2">
                        <div className="text-gray-500">Size</div>
                        <div className="text-cyan-400 font-bold">{videoFile ? (videoFile.size / 1024 / 1024).toFixed(2) : "—"} MB</div>
                      </div>
                      <div className="bg-slate-800/70 rounded p-2">
                        <div className="text-gray-500">Type</div>
                        <div className="text-cyan-400 font-bold truncate">{videoFile?.type || "—"}</div>
                      </div>
                      <div className="bg-slate-800/70 rounded p-2">
                        <div className="text-gray-500">Mode</div>
                        <div className="text-green-400 font-bold">Binary P2P</div>
                      </div>
                    </div>
                    {videoUploadResult ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-950/40 border border-green-500/30 text-xs">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-green-400">Transmitted · {videoUploadResult.spectral?.psi_channel ?? videoUploadResult.record?.psiChannel ?? realSpectral?.psi_channel ?? "Ψ(0,0,H)"} · λ={(videoUploadResult.spectral?.wavelength_mid_nm ?? parseFloat(videoUploadResult.record?.wavelengthNm ?? "550")).toFixed(2)}nm</span>
                      </div>
                    ) : (
                      <Button
                        onClick={transmitVideo}
                        disabled={isUploadingVideo}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-sm"
                        data-testid="button-transmit-video"
                      >
                        {isUploadingVideo ? (
                          <><Radio className="w-4 h-4 mr-2 animate-spin" /> Transmitting…</>
                        ) : (
                          <><Send className="w-4 h-4 mr-2" /> Transmit Video via P2P</>
                        )}
                      </Button>
                    )}
                    <button
                      className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline"
                      onClick={() => { setIsVideoMode(false); setVideoFile(null); if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); setVideoPreviewUrl(null); setVideoUploadResult(null); }}
                      data-testid="button-clear-video"
                    >
                      Clear video — switch to text mode
                    </button>
                  </div>
                ) : (
                  <div>
                    <Label className="text-gray-400 text-xs">Content</Label>
                    <Textarea data-testid="textarea-content" value={content} onChange={(e) => setContent(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white mt-1 font-mono min-h-[280px] text-sm"
                      placeholder="Type or paste content to transmit..." disabled={isTransmitting} />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{content.length.toLocaleString()} characters</span>
                      <span>{analysis?.wordCount.toLocaleString() || 0} words</span>
                    </div>
                  </div>
                )}
              </Card>

              <div className="space-y-3">
                {/* Real spectral channel */}
                <Card className="bg-slate-900/60 border-amber-500/30 p-4">
                  <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Spectral Channel
                    {isEncoding && <span className="text-xs text-amber-400/50 animate-pulse ml-1">encoding…</span>}
                  </h3>
                  {realSpectral ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse" style={{ background: realColor }} />
                        <span className="font-mono text-xs text-white">{realSpectral.psi_channel}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-800/70 rounded p-2">
                          <div className="text-gray-500">λ (nm)</div>
                          <div className="text-amber-400 font-bold">{parseFloat(realSpectral.wavelength_mid_nm ?? 0).toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-800/70 rounded p-2">
                          <div className="text-gray-500">freq (THz)</div>
                          <div className="text-cyan-400 font-bold">{(parseFloat(realSpectral.frequency_hz ?? 0) / 1e12).toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-800/70 rounded p-2">
                          <div className="text-gray-500">energy (J)</div>
                          <div className="text-green-400 font-bold">{parseFloat(realSpectral.energy_joules ?? 0).toExponential(2)}</div>
                        </div>
                        <div className="bg-slate-800/70 rounded p-2">
                          <div className="text-gray-500">band</div>
                          <div className="text-purple-400 font-bold">{realSpectral.band ?? "—"}</div>
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-500 bg-slate-800/40 rounded p-2 font-mono">
                        Λ = {parseFloat(realSpectral.lambda_mass_kg ?? 0).toExponential(3)} kg · WNSP-CE→SE
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs py-4 text-center">
                      {isEncoding ? "Encoding via CE→SE…" : "Type a document name to get real spectral address"}
                    </div>
                  )}
                  <Button onClick={() => encodeViaWNSP(documentName)} size="sm" variant="outline"
                    className="w-full mt-3 border-amber-500/40 text-amber-400 text-xs h-7" disabled={isEncoding}>
                    <Zap className="w-3 h-3 mr-1" /> {isEncoding ? "Encoding…" : "Re-encode via WNSP"}
                  </Button>
                </Card>

                {/* Quick stats */}
                <Card className="bg-slate-900/60 border-purple-500/30 p-4">
                  <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Quick Stats
                  </h3>
                  {analysis ? (
                    <div className="space-y-2 text-xs">
                      {[
                        { label: "Characters", value: analysis.totalChars.toLocaleString(), color: "text-white" },
                        { label: "Words / Lines", value: `${analysis.wordCount} / ${analysis.lineCount}`, color: "text-white" },
                        { label: "Avg λ", value: `${analysis.avgWavelength.toFixed(1)} nm`, color: "text-cyan-400" },
                        { label: "Est. NXT cost", value: analysis.estimatedCost.toFixed(8), color: "text-green-400" },
                      ].map(s => (
                        <div key={s.label} className="flex justify-between bg-slate-800/50 rounded px-2 py-1.5">
                          <span className="text-gray-400">{s.label}</span>
                          <span className={`font-bold ${s.color}`}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs py-4 text-center">Enter content to see stats</div>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── TRANSMIT ──────────────────────────────────────────────────── */}
          <TabsContent value="transmit" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-slate-900/60 border-cyan-500/30 p-5" data-testid="card-controls">
                <h2 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Controls
                </h2>
                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Document</div>
                    <div className="text-white font-semibold truncate text-sm">{documentName}</div>
                    <div className="text-xs text-gray-500">{content.length.toLocaleString()} chars</div>
                    {realSpectral && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: realColor }} />
                        <span className="text-xs font-mono" style={{ color: realColor }}>
                          {realSpectral.psi_channel} · {parseFloat(realSpectral.wavelength_mid_nm ?? 0).toFixed(1)}nm
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">Speed: {speed[0]}%</Label>
                    <Slider data-testid="slider-speed" value={speed} onValueChange={setSpeed} min={10} max={100} step={10} className="mt-2" disabled={isTransmitting} />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">Fiber: {fiberLength[0]}km</Label>
                    <Slider data-testid="slider-fiber" value={fiberLength} onValueChange={setFiberLength} min={10} max={500} step={10} className="mt-2" disabled={isTransmitting} />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">Noise: {channelNoise[0]}%</Label>
                    <Slider data-testid="slider-noise" value={channelNoise} onValueChange={setChannelNoise} min={0} max={20} step={1} className="mt-2" disabled={isTransmitting} />
                  </div>
                  <div className="flex gap-2">
                    {!isTransmitting ? (
                      <Button onClick={startTransmission} className="flex-1 bg-cyan-600 hover:bg-cyan-700" disabled={!content.trim()} data-testid="button-transmit">
                        <Play className="w-4 h-4 mr-2" /> Transmit
                      </Button>
                    ) : (
                      <Button onClick={resetTransmission} className="flex-1 bg-red-600 hover:bg-red-700" data-testid="button-stop">
                        <Pause className="w-4 h-4 mr-2" /> Stop
                      </Button>
                    )}
                    <Button variant="outline" onClick={resetTransmission} disabled={isTransmitting} className="border-slate-600" data-testid="button-reset">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Post-transmission actions */}
                  {transmissionProgress >= 100 && !isTransmitting && (
                    <div className="border border-green-500/20 rounded-lg p-3 space-y-2">
                      <div className="text-xs text-green-400 font-semibold mb-2">Transmission complete — next steps:</div>
                      <Button onClick={storeInSpectralDB} size="sm" className="w-full bg-cyan-800 hover:bg-cyan-700 text-xs"
                        disabled={isStoring || !!storedRecord} data-testid="button-store-db">
                        <Database className="w-3 h-3 mr-1.5" />
                        {storedRecord ? "✓ Stored in Spectral DB" : isStoring ? "Storing…" : "Store in Spectral DB"}
                      </Button>
                      <Button onClick={() => sendBusSignal("TRANSMIT_COMPLETE", realSpectral?.psi_channel ?? "Ψ(0,0,H)")}
                        size="sm" variant="outline" className="w-full border-purple-500/30 text-purple-400 text-xs"
                        disabled={isSendingBus || busSignalSent} data-testid="button-bus-signal">
                        <MessageSquare className="w-3 h-3 mr-1.5" />
                        {busSignalSent ? "✓ Bus signal sent" : isSendingBus ? "Sending…" : "Signal Agent Bus"}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="lg:col-span-2 bg-slate-900/60 border-green-500/30 p-5" data-testid="card-visualizer">
                <h2 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                  <Signal className="w-4 h-4" /> Photon Fiber Channel
                </h2>

                {transmissionProgress > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Transmission progress</span>
                      <span>{transmissionProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={transmissionProgress} className="h-2" data-testid="progress-transmission" />
                  </div>
                )}

                <div className="relative bg-slate-950 rounded-lg border border-slate-700 overflow-hidden" style={{ height: "220px" }} data-testid="photon-channel">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-px bg-gradient-to-r from-cyan-500/20 via-cyan-500/60 to-green-500/20" />
                  </div>
                  {photons.filter(p => p.status !== 'received').map(photon => (
                    <div key={photon.id} className="absolute top-1/2 -translate-y-1/2 transition-none" style={{ left: `${photon.position}%` }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold -translate-x-1/2 shadow-lg"
                        style={{ backgroundColor: wavelengthToColor(photon.wavelength), boxShadow: `0 0 12px ${wavelengthToColor(photon.wavelength)}60` }}>
                        {photon.char}
                      </div>
                    </div>
                  ))}
                  <div className="absolute left-3 top-2 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-lg bg-cyan-900/50 border-2 border-cyan-500 flex items-center justify-center" data-testid="transmitter">
                      <Radio className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="text-[9px] text-cyan-400 mt-1">TX</span>
                  </div>
                  <div className="absolute right-3 top-2 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-lg bg-green-900/50 border-2 border-green-500 flex items-center justify-center" data-testid="receiver">
                      <Signal className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-[9px] text-green-400 mt-1">RX</span>
                  </div>
                  <div className="absolute bottom-2 left-14 right-14 flex justify-between text-[9px] text-gray-600">
                    <span>0 km</span><span>{Math.round(fiberLength[0] / 2)} km</span><span>{fiberLength[0]} km</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-slate-800/50 rounded-lg p-2.5" data-testid="sent-display">
                    <div className="text-[10px] text-gray-400 mb-1">Transmitting (first 50)</div>
                    <div className="font-mono text-xs text-cyan-400 truncate">{content.slice(0, 50).toUpperCase() || "—"}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2.5" data-testid="received-display">
                    <div className="text-[10px] text-gray-400 mb-1">Received</div>
                    <div className="font-mono text-xs text-green-400 truncate">{receivedChars.join('') || "—"}</div>
                  </div>
                </div>

                {/* Ordinal receipt */}
                {ordinalReceipt && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3" data-testid="ordinal-receipt">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400">TRANSMIT Ordinal → Orbital Treasury</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-black/20 rounded p-2 text-center">
                        <div className="text-amber-400 font-bold">{parseInt(ordinalReceipt.units).toLocaleString()}</div>
                        <div className="text-amber-400/50 text-[9px]">NXT units</div>
                      </div>
                      <div className="bg-black/20 rounded p-2 text-center">
                        <div className="text-amber-400 font-bold">{ordinalReceipt.nxt}</div>
                        <div className="text-amber-400/50 text-[9px]">NXT</div>
                      </div>
                      <div className="bg-black/20 rounded p-2 text-center">
                        <div className="text-amber-400 font-bold text-[10px] font-mono">{ordinalReceipt.psi}</div>
                        <div className="text-amber-400/50 text-[9px]">Ψ channel</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stored record */}
                {storedRecord && (
                  <div className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs" data-testid="stored-record">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-400 font-bold">Stored in Spectral DB</span>
                    </div>
                    <div className="font-mono text-cyan-400/70">{storedRecord.psiChannel} · λ={parseFloat(storedRecord.wavelengthNm).toFixed(2)}nm · {storedRecord.band}</div>
                  </div>
                )}

                <Card className="mt-3 bg-slate-800/30 border-green-500/20 p-3" data-testid="card-logs">
                  <h3 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1.5">
                    <Signal className="w-3 h-3" /> Transmission Log
                  </h3>
                  <ScrollArea className="h-28">
                    <div className="space-y-0.5 font-mono text-[10px]" data-testid="log-container">
                      {transmissionLogs.length === 0 ? (
                        <div className="text-gray-500 text-center py-4">No activity yet</div>
                      ) : (
                        transmissionLogs.map((log, idx) => (
                          <div key={idx} className={`flex gap-2 py-0.5 px-1.5 rounded ${log.type === 'success' ? 'bg-green-900/20 text-green-400' : log.type === 'warning' ? 'bg-yellow-900/20 text-yellow-400' : 'text-gray-400'}`}>
                            <span className="text-gray-600 flex-shrink-0">[{log.time}]</span>
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

          {/* ── ANALYSIS ──────────────────────────────────────────────────── */}
          <TabsContent value="analyze" className="space-y-4">
            {analysis ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-slate-900/60 border-purple-500/30 p-5" data-testid="card-spectrum">
                  <h2 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <Atom className="w-4 h-4" /> Spectrum Distribution
                  </h2>
                  <div className="space-y-2.5">
                    {analysis.spectrumBands.map((band, idx) => (
                      <div key={idx} className="space-y-1" data-testid={`spectrum-band-${idx}`}>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-300">{band.name}</span>
                          <span className="text-gray-400">{band.count.toLocaleString()} ({band.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(band.percentage, 1)}%`, backgroundColor: band.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1.5">Visual spectrum</div>
                    <div className="h-6 rounded overflow-hidden flex">
                      {analysis.spectrumBands.map((band, idx) => (
                        <div key={idx} style={{ width: `${Math.max(band.percentage, 2)}%`, backgroundColor: band.color }} />
                      ))}
                    </div>
                  </div>
                </Card>

                <Card className="bg-slate-900/60 border-amber-500/30 p-5" data-testid="card-wavelength-map">
                  <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Top Character Wavelengths
                  </h2>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-1.5">
                      {analysis.wavelengthDistribution.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2" data-testid={`wavelength-${idx}`}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs"
                            style={{ backgroundColor: wavelengthToColor(item.wavelength) }}>
                            {item.char === ' ' ? '␣' : item.char}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-mono text-xs">λ = {item.wavelength.toFixed(1)} nm</div>
                            <div className="text-[10px] text-gray-400">f = {(SPEED_OF_LIGHT / (item.wavelength * 1e-9) / 1e12).toFixed(1)} THz</div>
                          </div>
                          <Badge variant="outline" className="text-gray-400 border-gray-600 text-[10px]">{item.count}×</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>

                <Card className="lg:col-span-2 bg-slate-900/60 border-green-500/30 p-5" data-testid="card-energy">
                  <h2 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                    <Calculator className="w-4 h-4" /> Energy & Cost Analysis
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Total Energy", value: analysis.totalEnergy.toExponential(4) + " J", color: "text-cyan-400" },
                      { label: "NXT Token Cost", value: analysis.estimatedCost.toFixed(8) + " NXT", color: "text-green-400" },
                      { label: "Energy/Char", value: (analysis.totalEnergy / analysis.totalChars).toExponential(4) + " J", color: "text-purple-400" },
                      { label: "Λ mass", value: (analysis.totalEnergy / (SPEED_OF_LIGHT ** 2)).toExponential(4) + " kg", color: "text-amber-400" },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                        <div className={`text-base font-bold font-mono ${s.color}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {realSpectral && (
                    <div className="mt-4 p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg">
                      <div className="text-xs text-amber-400 font-semibold mb-2">Real WNSP CE→SE encoding for "{documentName}"</div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div><span className="text-gray-400">Ψ channel: </span><span className="text-amber-400 font-mono">{realSpectral.psi_channel}</span></div>
                        <div><span className="text-gray-400">λ: </span><span className="text-amber-400 font-mono">{parseFloat(realSpectral.wavelength_mid_nm ?? 0).toFixed(3)} nm</span></div>
                        <div><span className="text-gray-400">freq: </span><span className="text-amber-400 font-mono">{(parseFloat(realSpectral.frequency_hz ?? 0) / 1e12).toFixed(3)} THz</span></div>
                        <div><span className="text-gray-400">E: </span><span className="text-amber-400 font-mono">{parseFloat(realSpectral.energy_joules ?? 0).toExponential(3)} J</span></div>
                        <div><span className="text-gray-400">Λ: </span><span className="text-amber-400 font-mono">{parseFloat(realSpectral.lambda_mass_kg ?? 0).toExponential(3)} kg</span></div>
                        <div><span className="text-gray-400">band: </span><span className="text-amber-400 font-mono">{realSpectral.band}</span></div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <Card className="bg-slate-900/60 border-slate-700 p-12 text-center">
                <FileUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Enter document content to see analysis</p>
              </Card>
            )}
          </TabsContent>

          {/* ── NETWORK ───────────────────────────────────────────────────── */}
          <TabsContent value="network" className="space-y-4">

            {/* ── P2P Receipt Log ───────────────────────────────────────── */}
            <Card className="bg-slate-900/60 border-green-500/30 p-5" data-testid="card-receipts">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Peer Receipt Log
                  {receiptsData?.count > 0 && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{receiptsData.count} confirmed</span>
                  )}
                </h2>
                <button onClick={() => refetchReceipts()} className="text-xs text-gray-500 hover:text-green-400" data-testid="button-refresh-receipts">↻ refresh</button>
              </div>
              {receiptsData?.receipts?.length > 0 ? (
                <div className="space-y-2">
                  {receiptsData.receipts.map((r: any, i: number) => {
                    const nm = parseFloat(r.peerWavelengthNm ?? 550);
                    const color = wavelengthToColor(nm);
                    return (
                      <div key={r.id ?? i} className="flex items-start gap-3 bg-slate-800/40 rounded-lg px-3 py-2.5 text-xs" data-testid={`receipt-row-${i}`}>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white font-semibold">{r.peerName}</span>
                            <span className="font-mono text-green-400 text-[10px]">{r.peerPsiChannel}</span>
                            <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: r.peerBand === "SYSTEM" ? "#3b82f620" : r.peerBand === "KERNEL" ? "#a855f720" : "#06b6d420", color: r.peerBand === "SYSTEM" ? "#3b82f6" : r.peerBand === "KERNEL" ? "#a855f7" : "#06b6d4" }}>{r.peerBand}</span>
                          </div>
                          <div className="text-gray-500 text-[10px] font-mono">
                            λ={nm.toFixed(2)}nm · {r.transmissionType} · {r.filename ?? r.transmissionId?.slice(0, 8)}
                            {r.bytesReceived && <span> · {(r.bytesReceived / 1024 / 1024).toFixed(2)}MB</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-green-400 text-[10px]">✓ received</div>
                          <div className="text-gray-600 text-[9px]">{new Date(r.receivedAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-xs">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No peer receipts yet — receipts are logged automatically when peers stream your transmissions
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Live spectral DB records */}
              <Card className="lg:col-span-2 bg-slate-900/60 border-cyan-500/30 p-5">
                <h2 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4" /> Spectral DB — Live Records
                </h2>
                <div className="space-y-2">
                  {((spectralDB?.records ?? spectralDB?.data) ?? []).slice(0, 8).map((rec: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-800/40 rounded-lg px-3 py-2 text-xs">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: wavelengthToColor(parseFloat(rec.wavelengthNm ?? 550)) }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-white truncate">{rec.label}</div>
                        <div className="text-gray-500 font-mono text-[10px]">{rec.psiChannel} · λ={parseFloat(rec.wavelengthNm ?? 0).toFixed(2)}nm</div>
                      </div>
                      <div className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: rec.band === "SYSTEM" ? "#3b82f620" : rec.band === "AUTH" ? "#a855f720" : "#06b6d420", color: rec.band === "SYSTEM" ? "#3b82f6" : rec.band === "AUTH" ? "#a855f7" : "#06b6d4" }}>{rec.band}</div>
                    </div>
                  ))}
                  {!(spectralDB?.records ?? spectralDB?.data)?.length && (
                    <div className="text-gray-500 text-xs text-center py-8">No records found — transmit and store to populate</div>
                  )}
                </div>
                <Link href="/spectral-db">
                  <Button variant="outline" size="sm" className="mt-3 border-cyan-500/30 text-cyan-400 text-xs w-full h-7">
                    <Eye className="w-3 h-3 mr-1" /> View full Spectral DB →
                  </Button>
                </Link>
              </Card>

              <div className="space-y-3">
                {/* Treasury ordinal breakdown */}
                <Card className="bg-slate-900/60 border-amber-500/30 p-4">
                  <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Ordinal Treasury
                  </h3>
                  {treasuryData?.registry ? (
                    <div className="space-y-1.5">
                      {treasuryData.registry.filter((r: any) => r.liveStats.count > 0).map((r: any) => (
                        <div key={r.operation} className="flex items-center justify-between text-xs bg-slate-800/40 rounded px-2 py-1.5">
                          <span className="font-bold" style={{ color: r.color }}>{r.operation}</span>
                          <div className="text-right">
                            <div className="text-white font-bold">{r.liveStats.count.toLocaleString()}</div>
                            <div className="text-gray-500 text-[9px]">{(r.liveStats.totalNxt).toFixed(4)} NXT</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs text-center py-4">Loading…</div>
                  )}
                  <Link href="/orbital-treasury">
                    <Button variant="outline" size="sm" className="mt-3 border-amber-500/30 text-amber-400 text-xs w-full h-7">
                      View Treasury →
                    </Button>
                  </Link>
                </Card>

                {/* Agent bus */}
                <Card className="bg-slate-900/60 border-purple-500/30 p-4">
                  <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Agent Bus
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between bg-slate-800/40 rounded px-2 py-1.5">
                      <span className="text-gray-400">Agents online</span>
                      <span className="text-purple-400 font-bold">{busData?.agents ?? "—"}</span>
                    </div>
                    <div className="flex justify-between bg-slate-800/40 rounded px-2 py-1.5">
                      <span className="text-gray-400">Messages sent</span>
                      <span className="text-purple-400 font-bold">{busData?.total_sent ?? "—"}</span>
                    </div>
                    <div className="flex justify-between bg-slate-800/40 rounded px-2 py-1.5">
                      <span className="text-gray-400">Queue depth</span>
                      <span className="text-purple-400 font-bold">{busData?.queued ?? "—"}</span>
                    </div>
                  </div>
                  <Link href="/agent-bus">
                    <Button variant="outline" size="sm" className="mt-3 border-purple-500/30 text-purple-400 text-xs w-full h-7">
                      View Agent Bus →
                    </Button>
                  </Link>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── REPORTS ───────────────────────────────────────────────────── */}
          <TabsContent value="reports" className="space-y-4">
            {reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report, idx) => (
                  <Card key={idx} className="bg-slate-900/60 border-rose-500/30 p-4" data-testid={`report-${idx}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white">{report.documentName}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <Clock className="w-3 h-3" /> {new Date(report.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => exportReport(report)}
                        className="border-rose-500/40 text-rose-400 text-xs h-7" data-testid={`button-export-${idx}`}>
                        <Download className="w-3 h-3 mr-1" /> Export
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      {[
                        { label: "Characters", value: report.summary.totalChars.toLocaleString(), color: "text-white" },
                        { label: "Words", value: report.summary.wordCount.toLocaleString(), color: "text-white" },
                        { label: "Time", value: report.transmissionTime.toFixed(2) + "s", color: "text-cyan-400" },
                        { label: "NXT Cost", value: report.summary.estimatedCost.toFixed(6), color: "text-green-400" },
                        { label: "Avg λ", value: report.summary.avgWavelength.toFixed(1) + "nm", color: "text-purple-400" },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-800/50 rounded p-2">
                          <div className="text-gray-400 text-[10px]">{s.label}</div>
                          <div className={`font-bold ${s.color}`}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {report.ordinal && (
                      <div className="mt-2 text-[10px] text-amber-400/70 font-mono">
                        💎 Ordinal: {report.ordinal.units} NXT units → Treasury
                      </div>
                    )}
                    {report.spectralRecord && (
                      <div className="mt-1 text-[10px] text-cyan-400/70 font-mono">
                        📦 Spectral DB: {report.spectralRecord.psiChannel} λ={parseFloat(report.spectralRecord.wavelengthNm).toFixed(2)}nm
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900/60 border-slate-700 p-12 text-center">
                <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Complete a transmission to generate a report</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Physics footer */}
        <Card className="mt-5 bg-slate-900/60 border-purple-500/20 p-4" data-testid="card-physics-info">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { title: "WNSP-CE Encoding", formula: "char → ordinal → [0,1]", detail: "Every character maps to a normalised token", color: "text-cyan-400" },
              { title: "WNSP-SE Wavelength", formula: "λ = 380 + (token × 400) nm", detail: "Token maps to visible spectrum address", color: "text-green-400" },
              { title: "Energy E=hf", formula: "E = h × c / λ", detail: "Planck energy per photon at that wavelength", color: "text-purple-400" },
              { title: "Lambda Boson Λ=hf/c²", formula: "Λ = E / c²", detail: "Mass-equivalent of the oscillating quantum", color: "text-amber-400" },
            ].map(s => (
              <div key={s.title} className="bg-slate-800/50 rounded-lg p-3">
                <div className={`font-semibold mb-1 ${s.color}`}>{s.title}</div>
                <div className="text-gray-300 font-mono text-[10px] mb-1">{s.formula}</div>
                <div className="text-gray-500 text-[10px]">{s.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
