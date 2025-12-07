import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Waves, 
  Atom, 
  Shield, 
  ArrowRight,
  Code,
  CheckCircle,
  Gauge,
  Server,
  FileCode,
  Activity
} from "lucide-react";
import { Link } from "wouter";

export default function AnnouncementSubstrateV2Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <span className="text-cyan-400 hover:text-cyan-300 cursor-pointer text-sm flex items-center gap-1 mb-4" data-testid="link-back-home">
              ← Back to NexusOS
            </span>
          </Link>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mb-4" data-testid="badge-category">
            Technical Update
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" data-testid="text-title">
            Enhanced Lambda Boson Substrate v2
          </h1>
          <p className="text-xl text-purple-300 mb-2">Community Update</p>
          <div className="flex items-center gap-4 text-gray-400">
            <span data-testid="text-date">December 5, 2025</span>
            <span className="text-gray-600">•</span>
            <span data-testid="text-repo">Repository: WNSP-P2P-Hub</span>
          </div>
        </div>

        {/* Overview */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30 p-6 mb-6" data-testid="card-overview">
          <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            <Atom className="w-6 h-6" />
            Overview
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            We have completed a significant update to the <span className="text-purple-400 font-semibold">Enhanced Lambda Boson Substrate v2</span>, 
            ensuring mathematical consistency across all system components. This update aligns the physics-based calculations with UV frequency constraints.
          </p>
        </Card>

        {/* Summary of Improvements */}
        <Card className="bg-slate-900/50 border-amber-500/30 p-6 mb-6" data-testid="card-improvements">
          <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">
            <Gauge className="w-6 h-6" />
            Summary of Improvements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/40 rounded-xl p-5 text-center" data-testid="improvement-capacity">
              <div className="text-5xl font-bold text-green-400 mb-2">1.5x</div>
              <div className="text-white font-semibold mb-1">Capacity</div>
              <div className="text-gray-400 text-sm">12 bits/byte vs 8 bits/byte baseline</div>
            </div>
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-500/40 rounded-xl p-5 text-center" data-testid="improvement-robustness">
              <div className="text-5xl font-bold text-blue-400 mb-2">8x</div>
              <div className="text-white font-semibold mb-1">Robustness</div>
              <div className="text-gray-400 text-sm">UV-limited harmonics per spectral band</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-500/40 rounded-xl p-5 text-center" data-testid="improvement-throughput">
              <div className="text-5xl font-bold text-purple-400 mb-2">4x</div>
              <div className="text-white font-semibold mb-1">Throughput</div>
              <div className="text-gray-400 text-sm">4 parallel spectral bands</div>
            </div>
          </div>
        </Card>

        {/* Technical Details */}
        <Card className="bg-slate-900/50 border-cyan-500/30 p-6 mb-6" data-testid="card-technical-details">
          <h2 className="text-2xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
            <Code className="w-6 h-6" />
            Technical Details
          </h2>
          
          <div className="space-y-6">
            {/* Capacity Enhancement */}
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-5">
              <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Capacity Enhancement (1.5x)
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><span className="text-white font-medium">Multi-level modulation (QAM-256):</span> 8 bits per symbol</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><span className="text-white font-medium">Phase encoding:</span> 4 bits per oscillator</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><span className="text-white font-medium">Total:</span> 12 bits/byte vs 8 bits/byte baseline</span>
                </li>
              </ul>
            </div>

            {/* Robustness Enhancement */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-5">
              <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Robustness Enhancement (8x average)
              </h3>
              <p className="text-gray-300 mb-3">
                Harmonic stacking: configured for 32 harmonics per fundamental
              </p>
              <p className="text-gray-400 mb-3">
                UV limit (3e15 Hz) caps harmonics per spectral band:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {[
                  { band: "VIS-B (Blue)", harmonics: 4, color: "blue" },
                  { band: "VIS-R (Red)", harmonics: 5, color: "red" },
                  { band: "NIR (Near-IR)", harmonics: 9, color: "orange" },
                  { band: "TELECOM", harmonics: 14, color: "green" }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-center" data-testid={`band-${item.band}`}>
                    <div className={`text-${item.color}-400 text-xs mb-1`}>{item.band}</div>
                    <div className="text-white font-bold text-xl">{item.harmonics}</div>
                    <div className="text-gray-500 text-xs">harmonics</div>
                  </div>
                ))}
              </div>
              <p className="text-blue-300 text-sm">Average: ~8x error redundancy</p>
            </div>

            {/* Throughput Enhancement */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-5">
              <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Throughput Enhancement (4x)
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span><span className="text-white font-medium">Multi-band parallel encoding:</span> 4 spectral bands</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Data distributed across VIS-B, VIS-R, NIR, TELECOM</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Enables parallel processing of data streams</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Physics Foundation */}
        <Card className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/30 p-6 mb-6" data-testid="card-physics">
          <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2">
            <Waves className="w-6 h-6" />
            Physics Foundation
          </h2>
          <p className="text-gray-300 mb-4">
            The substrate continues to operate on Lambda Boson physics:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/60 rounded-lg p-4 text-center border border-indigo-500/20">
              <div className="text-gray-400 text-sm mb-2">Lambda Equation</div>
              <div className="font-mono text-xl text-indigo-400 font-bold">Λ = hf/c²</div>
              <div className="text-gray-500 text-xs mt-1">mass-equivalent of oscillation</div>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-4 text-center border border-purple-500/20">
              <div className="text-gray-400 text-sm mb-2">Energy Equation</div>
              <div className="font-mono text-xl text-purple-400 font-bold">E = hf</div>
              <div className="text-gray-500 text-xs mt-1">Planck energy</div>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-4 text-center border border-cyan-500/20">
              <div className="text-gray-400 text-sm mb-2">Conservation</div>
              <div className="font-mono text-sm text-cyan-400 font-bold">ΣΛ_in = ΣΛ_out + ΣΛ_stored + ΣΛ_dissipated</div>
            </div>
          </div>
        </Card>

        {/* Files Updated */}
        <Card className="bg-slate-900/50 border-gray-500/30 p-6 mb-6" data-testid="card-files">
          <h2 className="text-2xl font-bold text-gray-300 mb-4 flex items-center gap-2">
            <FileCode className="w-6 h-6" />
            Files Updated
          </h2>
          <div className="space-y-2">
            {[
              { file: "wnsp_v7/substrate_v2.py", desc: "Core encoder implementation" },
              { file: "mobile_api.py", desc: "Mobile API endpoints for substrate operations" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3" data-testid={`file-${i}`}>
                <FileCode className="w-4 h-4 text-gray-500" />
                <code className="text-cyan-400 font-mono text-sm">{item.file}</code>
                <span className="text-gray-500">-</span>
                <span className="text-gray-400 text-sm">{item.desc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* API Endpoints */}
        <Card className="bg-slate-900/50 border-green-500/30 p-6 mb-6" data-testid="card-endpoints">
          <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
            <Server className="w-6 h-6" />
            API Endpoints Updated
          </h2>
          <div className="space-y-3">
            {[
              { endpoint: "/api/substrate/info", desc: "Returns substrate version info with achievable harmonics per band" },
              { endpoint: "/api/substrate/encode", desc: "Encodes data using UV-limited harmonics" },
              { endpoint: "/api/substrate/enhancements", desc: "Lists all enhancement vectors" }
            ].map((item, i) => (
              <div key={i} className="bg-green-900/20 border border-green-500/20 rounded-lg p-4" data-testid={`endpoint-${i}`}>
                <code className="text-green-400 font-mono font-semibold">{item.endpoint}</code>
                <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Verification */}
        <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/40 p-6 mb-6" data-testid="card-verification">
          <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Verification
          </h2>
          <p className="text-gray-300 mb-4">All calculations have been verified:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "33 bytes input → 396 bits capacity (12 bits/byte)",
              "246 oscillators (computed using achievable harmonics)",
              "8x average robustness across all bands",
              "4x throughput from parallel bands"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-green-900/30 border border-green-500/30 rounded-lg p-3" data-testid={`verify-${i}`}>
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <span className="text-gray-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Navigation Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link href="/announcements">
            <span className="inline-flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-indigo-500/30 text-indigo-400 px-4 py-2 rounded-lg cursor-pointer transition-colors" data-testid="link-announcements">
              View All Announcements <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
          <Link href="/v7">
            <span className="inline-flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg cursor-pointer transition-colors" data-testid="link-wnsp-v7">
              View WNSP v7.0 <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
