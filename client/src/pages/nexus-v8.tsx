import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { colorBadge } from "@/lib/color-classes";
import { Atom, Zap, Scale, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

export default function NexusV8Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-slate-950 p-4 md:p-8" data-testid="page-nexus-v8">
      <div className="max-w-5xl mx-auto">
        <Link href="/">
          <div className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors cursor-pointer mb-6" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </div>
        </Link>
        <div className="flex items-center justify-between mb-8">
          <Link href="/v7">
            <a className="flex items-center gap-2 text-amber-400 hover:text-amber-300" data-testid="link-prev-version">
              <ArrowLeft className="w-4 h-4" />
              <span>v7.0</span>
            </a>
          </Link>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30" data-testid="badge-version">
            NexusOS v8.0
          </Badge>
          <Link href="/v9">
            <a className="flex items-center gap-2 text-amber-400 hover:text-amber-300" data-testid="link-next-version">
              <span>v9.0</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Atom className="w-12 h-12 text-amber-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 bg-clip-text text-transparent" data-testid="text-title">
              Lambda Integration
            </h1>
          </div>
          <p className="text-xl text-amber-300" data-testid="text-subtitle">
            The Unification of Mass and Frequency
          </p>
        </div>

        <Card className="bg-gradient-to-br from-amber-900/20 to-amber-950/40 border-amber-500/30 p-8 mb-8" data-testid="card-overview">
          <h2 className="text-2xl font-bold text-amber-400 mb-4">Version 8.0 Overview</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            NexusOS v8.0 introduced the Lambda Boson equation (Λ = hf/c²), unifying Planck's quantum mechanics 
            with Einstein's relativity. This version established the mathematical framework for treating 
            oscillation as the fundamental substance of reality.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4" data-testid="feature-lambda">
              <Atom className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Lambda Boson</h3>
              <p className="text-gray-400 text-sm">Λ = hf/c² mass-frequency unity</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4" data-testid="feature-spectral">
              <Scale className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Spectral Authority</h3>
              <p className="text-gray-400 text-sm">Governance through wavelength bands</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4" data-testid="feature-resonance">
              <Zap className="w-8 h-8 text-cyan-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Harmonic Resonance</h3>
              <p className="text-gray-400 text-sm">Synchronized oscillation patterns</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/40 border-purple-500/30 p-8 mb-8" data-testid="card-equation">
          <h2 className="text-2xl font-bold text-purple-400 mb-6 text-center">The Master Equation</h2>
          <div className="bg-slate-800/80 rounded-xl p-8 text-center">
            <div className="text-gray-400 mb-4">Planck (1900) + Einstein (1905)</div>
            <div className="font-mono text-3xl text-white mb-4">E = hf = mc²</div>
            <div className="text-gray-400 mb-4">Rearranging for mass:</div>
            <div className="font-mono text-4xl text-amber-400 font-bold mb-4">Λ = hf/c²</div>
            <div className="text-gray-300 text-sm">
              Mass is the direct product of frequency and fundamental constants.
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-cyan-500/30 p-6" data-testid="card-spectral-bands">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Spectral Authority Bands</h3>
            <div className="space-y-3">
              {[
                { band: "PLANCK", range: "10⁴³+ Hz", role: "Constitutional", color: "amber" },
                { band: "GAMMA", range: "10¹⁹-10²⁴ Hz", role: "Judicial", color: "red" },
                { band: "X-RAY", range: "10¹⁶-10¹⁹ Hz", role: "Executive", color: "purple" },
                { band: "UV", range: "10¹⁴-10¹⁶ Hz", role: "Legislative", color: "blue" },
                { band: "VISIBLE", range: "10¹⁴ Hz", role: "Administrative", color: "green" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded p-3" data-testid={`band-row-${item.band.toLowerCase()}`}>
                  <Badge className={colorBadge[item.color]}>
                    {item.band}
                  </Badge>
                  <span className="text-gray-400 font-mono text-xs">{item.range}</span>
                  <span className="text-gray-300 text-sm">{item.role}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-orange-500/30 p-6" data-testid="card-implications">
            <h3 className="text-xl font-bold text-orange-400 mb-4">Key Implications</h3>
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Mass-Frequency Equivalence</h4>
                <p className="text-gray-400 text-sm">
                  Every particle's mass corresponds to a specific frequency. 
                  Change the frequency, change the mass.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Oscillation Primacy</h4>
                <p className="text-gray-400 text-sm">
                  Matter is not fundamental—oscillation is. 
                  Particles are "frozen" frequencies.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Governance by Physics</h4>
                <p className="text-gray-400 text-sm">
                  Authority hierarchies map to frequency bands, 
                  creating physics-based governance.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <Link href="/v7">
            <a className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to v7.0</span>
            </a>
          </Link>
          <Link href="/v9">
            <a className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors" data-testid="button-upgrade">
              <span>Upgrade to v9.0</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
