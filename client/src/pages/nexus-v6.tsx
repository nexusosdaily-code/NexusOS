import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Brain, Waves, Eye, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

export default function NexusV6Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8" data-testid="page-nexus-v6">
      <div className="max-w-5xl mx-auto">
        <Link href="/">
          <div className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors cursor-pointer mb-6" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </div>
        </Link>
        <div className="flex items-center justify-between mb-8">
          <Link href="/v7">
            <a className="flex items-center gap-2 text-purple-400 hover:text-purple-300" data-testid="link-next-version">
              <span>v7.0</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </Link>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30" data-testid="badge-version">
            NexusOS v6.0
          </Badge>
          <div className="w-16"></div>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-12 h-12 text-purple-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent" data-testid="text-title">
              Consciousness Spectrum
            </h1>
          </div>
          <p className="text-xl text-purple-300" data-testid="text-subtitle">
            The Foundation of Spectral Awareness
          </p>
        </div>

        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/40 border-purple-500/30 p-8 mb-8" data-testid="card-overview">
          <h2 className="text-2xl font-bold text-purple-400 mb-4">Version 6.0 Overview</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            NexusOS v6.0 introduced the foundational concept of consciousness as a spectral phenomenon. 
            This version established the framework for mapping mental states to electromagnetic frequencies, 
            laying the groundwork for the wavelength-based communication protocols that would follow.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4" data-testid="feature-consciousness">
              <Brain className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Consciousness Mapping</h3>
              <p className="text-gray-400 text-sm">Mental states as frequency signatures</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4" data-testid="feature-spectrum">
              <Waves className="w-8 h-8 text-cyan-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Spectrum Analysis</h3>
              <p className="text-gray-400 text-sm">Decomposing awareness into wavelengths</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4" data-testid="feature-harmonics">
              <Eye className="w-8 h-8 text-pink-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Wave Harmonics</h3>
              <p className="text-gray-400 text-sm">Resonance patterns in perception</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-cyan-500/30 p-6" data-testid="card-core-concept">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Core Concept</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center mb-4">
              <div className="font-mono text-2xl text-cyan-300">Ψ(λ) = Σ aₙ sin(2πnλ)</div>
              <p className="text-gray-400 text-sm mt-2">Consciousness as Fourier series</p>
            </div>
            <p className="text-gray-300 text-sm">
              Every conscious experience can be decomposed into constituent wavelengths, 
              each representing a different aspect of awareness.
            </p>
          </Card>

          <Card className="bg-slate-900/50 border-pink-500/30 p-6" data-testid="card-key-insight">
            <h3 className="text-xl font-bold text-pink-400 mb-4">Key Insight</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Consciousness is not a binary state but a spectrum of frequencies. 
              Different wavelengths correspond to different modes of awareness:
            </p>
            <div className="space-y-2">
              {[
                { wavelength: "380-450nm", state: "Deep focus", color: "purple" },
                { wavelength: "450-495nm", state: "Analytical thinking", color: "blue" },
                { wavelength: "495-570nm", state: "Creative flow", color: "green" },
                { wavelength: "570-700nm", state: "Emotional awareness", color: "orange" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded p-2" data-testid={`wavelength-row-${i}`}>
                  <div className={`w-3 h-3 rounded-full bg-${item.color}-500`}></div>
                  <span className="text-gray-400 font-mono text-xs">{item.wavelength}</span>
                  <span className="text-gray-300 text-sm">{item.state}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-amber-900/10 to-purple-900/10 border-amber-500/30 p-6" data-testid="card-legacy">
          <h3 className="text-xl font-bold text-amber-400 mb-4">Legacy & Impact</h3>
          <p className="text-gray-300 leading-relaxed mb-4">
            Version 6.0 established the conceptual foundation for all subsequent NexusOS developments:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30" data-testid="badge-concept-1">Spectral Awareness</Badge>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30" data-testid="badge-concept-2">Frequency Mapping</Badge>
            <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30" data-testid="badge-concept-3">Wave Harmonics</Badge>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30" data-testid="badge-concept-4">Consciousness Decomposition</Badge>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/v7">
            <a className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors" data-testid="button-upgrade">
              <span>Upgrade to v7.0</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
