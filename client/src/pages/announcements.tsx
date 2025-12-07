import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Waves, 
  Zap, 
  Layers, 
  Shield, 
  GitBranch, 
  Radio,
  ArrowRight,
  ExternalLink,
  Code,
  BookOpen,
  Cpu,
  Network
} from "lucide-react";
import { Link } from "wouter";

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <span className="text-cyan-400 hover:text-cyan-300 cursor-pointer text-sm flex items-center gap-1 mb-4" data-testid="link-back-home">
              ← Back to NexusOS
            </span>
          </Link>
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 mb-4" data-testid="badge-category">
            Announcements
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2" data-testid="text-title">
            WNSP Protocol Stack Implementation
          </h1>
          <p className="text-gray-400 text-lg" data-testid="text-date">December 2025</p>
        </div>

        {/* What's New */}
        <Card className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30 p-6 mb-6" data-testid="card-whats-new">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6" />
            What's New
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Following the theoretical foundation, we now release the <span className="text-cyan-400 font-semibold">WNSP Protocol Stack Implementation</span> paper — 
            the complete technical specification for the world's first physics-based networking and blockchain protocol.
          </p>
        </Card>

        {/* Protocol Overview Comparison */}
        <Card className="bg-slate-900/50 border-purple-500/30 p-6 mb-6" data-testid="card-protocol-overview">
          <h2 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Protocol Overview
          </h2>
          <p className="text-gray-300 mb-6">
            WNSP replaces traditional binary computation with electromagnetic wave states:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 text-gray-400 font-semibold">Traditional</th>
                  <th className="text-left p-3 text-purple-400 font-semibold">WNSP</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { traditional: "Binary (2 states)", wnsp: "Multi-dimensional (continuous)" },
                  { traditional: "Computational security", wnsp: "Physical security" },
                  { traditional: "Single-channel", wnsp: "Multi-channel (wavelength + OAM)" },
                  { traditional: "Energy-agnostic", wnsp: "Energy-grounded (E = hf)" }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-800" data-testid={`row-comparison-${i}`}>
                    <td className="p-3 text-gray-500">{row.traditional}</td>
                    <td className="p-3 text-purple-300 font-medium">{row.wnsp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Paper Highlights */}
        <Card className="bg-slate-900/50 border-amber-500/30 p-6 mb-6" data-testid="card-highlights">
          <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Paper Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: <Layers className="w-5 h-5" />, title: "7-Layer Protocol Stack", desc: "From physical layer to application layer", color: "cyan" },
              { icon: <Waves className="w-5 h-5" />, title: "Wavelength Encoding", desc: "100 WDM channels across visible spectrum", color: "blue" },
              { icon: <Radio className="w-5 h-5" />, title: "OAM Multiplexing", desc: "8 orthogonal angular momentum modes (800+ channels total)", color: "purple" },
              { icon: <Shield className="w-5 h-5" />, title: "7-Band Authority Spectrum", desc: "NANO → MICRO → MILLI → BASE → KILO → MEGA → GIGA", color: "green" },
              { icon: <Zap className="w-5 h-5" />, title: "PoSPECTRUM Consensus", desc: "Proof-of-Spectrum replacing wasteful proof-of-work", color: "amber" },
              { icon: <GitBranch className="w-5 h-5" />, title: "GhostDAG Integration", desc: "DAG-based transaction processing with wavelength weighting", color: "orange" }
            ].map((item, i) => (
              <div 
                key={i} 
                className={`bg-${item.color}-900/20 border border-${item.color}-500/30 rounded-lg p-4 hover:border-${item.color}-500/50 transition-colors`}
                data-testid={`highlight-${i}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-${item.color}-400 mt-0.5`}>{item.icon}</div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Channel Capacity */}
        <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30 p-6 mb-6" data-testid="card-channel-capacity">
          <h2 className="text-2xl font-bold text-green-400 mb-6 flex items-center gap-2">
            <Network className="w-6 h-6" />
            Channel Capacity
          </h2>
          <div className="bg-slate-800/60 rounded-xl p-6 font-mono text-center mb-6 border border-green-500/20">
            <div className="text-gray-400 text-sm mb-2">Total Channels = WDM × OAM × Polarization</div>
            <div className="text-3xl md:text-4xl text-green-400 font-bold mb-4">
              = 100 × 8 × 2 = <span className="text-white">1,600</span> orthogonal channels
            </div>
            <div className="text-cyan-400 text-lg">
              With 16-QAM: <span className="text-white font-bold">640 Tbps</span> theoretical capacity @ 100 Gbaud
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-800/40 rounded-lg p-4 border border-blue-500/20">
              <div className="text-3xl font-bold text-blue-400">100</div>
              <div className="text-gray-400 text-sm">WDM Channels</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 border border-purple-500/20">
              <div className="text-3xl font-bold text-purple-400">8</div>
              <div className="text-gray-400 text-sm">OAM Modes</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 border border-green-500/20">
              <div className="text-3xl font-bold text-green-400">2</div>
              <div className="text-gray-400 text-sm">Polarizations</div>
            </div>
          </div>
        </Card>

        {/* Read the Paper CTA */}
        <Card className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-500/40 p-6 mb-6" data-testid="card-read-paper">
          <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Read the Paper
          </h2>
          <a 
            href="#" 
            className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
            data-testid="link-paper"
          >
            <FileText className="w-6 h-6" />
            WNSP Protocol Stack Implementation
            <ExternalLink className="w-5 h-5" />
          </a>
        </Card>

        {/* For Developers */}
        <Card className="bg-slate-900/50 border-cyan-500/30 p-6" data-testid="card-developers">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <Code className="w-6 h-6" />
            For Developers
          </h2>
          <p className="text-gray-300 mb-4">
            This paper is your technical reference for:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: <Waves className="w-4 h-4" />, text: "Understanding wavelength encoding schemes" },
              { icon: <Radio className="w-4 h-4" />, text: "Implementing OAM multiplexing" },
              { icon: <Cpu className="w-4 h-4" />, text: "Building PoSPECTRUM validators" },
              { icon: <GitBranch className="w-4 h-4" />, text: "Integrating with the DAG messaging system" }
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex items-center gap-3 bg-cyan-900/20 border border-cyan-500/20 rounded-lg p-3"
                data-testid={`dev-item-${i}`}
              >
                <div className="text-cyan-400">{item.icon}</div>
                <span className="text-gray-300">{item.text}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Navigation Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link href="/v7">
            <span className="inline-flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg cursor-pointer transition-colors" data-testid="link-wnsp-v7">
              View WNSP v7.0 <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
          <Link href="/encoding-lab">
            <span className="inline-flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-purple-500/30 text-purple-400 px-4 py-2 rounded-lg cursor-pointer transition-colors" data-testid="link-encoding-lab">
              Try Encoding Lab <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
