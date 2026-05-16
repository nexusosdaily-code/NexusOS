import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Network, Layers, CheckCircle, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

export default function NexusV9Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 p-4 md:p-8" data-testid="page-nexus-v9">
      <div className="max-w-5xl mx-auto">
        <Link href="/">
          <div className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer mb-6" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </div>
        </Link>
        <div className="flex items-center justify-between mb-8">
          <Link href="/v8">
            <a className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300" data-testid="link-prev-version">
              <ArrowLeft className="w-4 h-4" />
              <span>v8.0</span>
            </a>
          </Link>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30" data-testid="badge-version">
            NexusOS v9.0
          </Badge>
          <Link href="/v10">
            <a className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300" data-testid="link-next-version">
              <span>v10.0</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Network className="w-12 h-12 text-cyan-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent" data-testid="text-title">
              Unified Substrate
            </h1>
          </div>
          <p className="text-xl text-cyan-300" data-testid="text-subtitle">
            Coherent Networks and Truth Verification
          </p>
        </div>

        <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-950/40 border-cyan-500/30 p-8 mb-8" data-testid="card-overview">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">Version 9.0 Overview</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            NexusOS v9.0 introduced the Unified Substrate—a coherent network layer that enables 
            truth verification and multiscale dynamics. This version bridged individual wavelength 
            operations into a cohesive, self-organizing system.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4" data-testid="feature-networks">
              <Network className="w-8 h-8 text-cyan-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Coherent Networks</h3>
              <p className="text-gray-400 text-sm">Self-organizing wavelength meshes</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4" data-testid="feature-multiscale">
              <Layers className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Multiscale Dynamics</h3>
              <p className="text-gray-400 text-sm">Operations across frequency scales</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4" data-testid="feature-truth">
              <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Truth Substrate</h3>
              <p className="text-gray-400 text-sm">Verification through coherence</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-green-500/30 p-6" data-testid="card-truth-verification">
            <h3 className="text-xl font-bold text-green-400 mb-4">Truth Verification System</h3>
            <p className="text-gray-300 text-sm mb-4">
              Truth is verified through coherence patterns. Information that maintains 
              wave coherence across multiple scales is considered "true":
            </p>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center mb-4">
              <div className="font-mono text-xl text-green-300">T(Ψ) = ∫|⟨Ψ|Ψ_ref⟩|² dλ</div>
              <p className="text-gray-400 text-xs mt-2">Truth measure via coherence integral</p>
            </div>
            <div className="space-y-2">
              {[
                { level: "100%", label: "Perfect coherence", status: "Absolute truth" },
                { level: "75%+", label: "High coherence", status: "Verified claim" },
                { level: "50%", label: "Partial coherence", status: "Uncertain" },
                { level: "<25%", label: "Low coherence", status: "Likely false" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded p-2" data-testid={`truth-level-${i}`}>
                  <span className="text-green-400 font-mono text-sm">{item.level}</span>
                  <span className="text-gray-400 text-xs">{item.label}</span>
                  <span className="text-gray-300 text-sm">{item.status}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/30 p-6" data-testid="card-coherent-networks">
            <h3 className="text-xl font-bold text-purple-400 mb-4">Coherent Network Architecture</h3>
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Nodes</h4>
                <p className="text-gray-400 text-sm">
                  Individual wavelength processors maintaining local coherence. 
                  Each node represents a specific frequency band.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Edges</h4>
                <p className="text-gray-400 text-sm">
                  Phase-locked connections between nodes. Edge strength determined 
                  by interference pattern stability.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Clusters</h4>
                <p className="text-gray-400 text-sm">
                  Self-organized groups of coherent nodes. Clusters form naturally 
                  around harmonic frequencies.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-teal-900/20 to-teal-950/40 border-teal-500/30 p-6 mb-8" data-testid="card-multiscale">
          <h3 className="text-xl font-bold text-teal-400 mb-4">Multiscale Dynamics</h3>
          <p className="text-gray-300 text-sm mb-4">
            The Unified Substrate operates across multiple frequency scales simultaneously:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { scale: "Nano", range: "10¹⁵+ Hz", domain: "Particle" },
              { scale: "Micro", range: "10¹²-10¹⁵ Hz", domain: "Molecular" },
              { scale: "Meso", range: "10⁹-10¹² Hz", domain: "Cellular" },
              { scale: "Macro", range: "<10⁹ Hz", domain: "Systemic" },
            ].map((item, i) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-4 text-center" data-testid={`scale-${item.scale.toLowerCase()}`}>
                <div className="text-teal-400 font-semibold mb-1">{item.scale}</div>
                <div className="text-gray-400 font-mono text-xs mb-2">{item.range}</div>
                <div className="text-gray-300 text-sm">{item.domain}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/10 to-cyan-900/10 border-amber-500/30 p-6" data-testid="card-transition">
          <h3 className="text-xl font-bold text-amber-400 mb-4">Transition to v10.0</h3>
          <p className="text-gray-300 leading-relaxed mb-4">
            Version 9.0's Unified Substrate set the stage for the complete civilization architecture 
            of v10.0. The coherent networks became the foundation for constitutional governance, 
            and the truth substrate evolved into the Lambda-Truth verification system.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30" data-testid="badge-evolved-1">Networks → Constitution</Badge>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30" data-testid="badge-evolved-2">Truth → Governance</Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30" data-testid="badge-evolved-3">Multiscale → IHR</Badge>
          </div>
        </Card>

        <div className="flex justify-center gap-4 mt-8">
          <Link href="/v8">
            <a className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to v8.0</span>
            </a>
          </Link>
          <Link href="/v10">
            <a className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg transition-colors" data-testid="button-upgrade">
              <span>Upgrade to v10.0</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
