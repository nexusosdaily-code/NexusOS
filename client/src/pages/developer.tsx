import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Zap, Key, Copy, CheckCircle, Terminal, Globe, Shield,
  Code2, Cpu, ArrowRight, ExternalLink, Package, BookOpen,
  Activity, Wifi, BarChart3, Hash, Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyBtn text={code} />
      </div>
      <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointRow({ method, path, desc, fee, free }: { method: string; path: string; desc: string; fee?: string; free?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-800/60 last:border-0">
      <span className={`mt-0.5 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md shrink-0 ${
        method === "GET" ? "bg-blue-900/50 text-blue-300" :
        method === "POST" ? "bg-green-900/50 text-green-300" : "bg-slate-800 text-slate-400"
      }`}>{method}</span>
      <div className="flex-1 min-w-0">
        <code className="text-sm text-white font-mono">{path}</code>
        <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
      </div>
      {free
        ? <span className="text-[10px] font-mono text-slate-600 shrink-0 mt-1">free</span>
        : fee ? <span className="text-[10px] font-mono text-cyan-500 shrink-0 mt-1">{fee}</span> : null}
    </div>
  );
}

const BASE = typeof window !== "undefined" ? window.location.origin : "https://wnsp.io";

export default function DeveloperPage() {
  const { data: status } = useQuery<any>({
    queryKey: ["/api/platform/status"],
    refetchInterval: 30_000,
  });
  const { data: etchStatus } = useQuery<any>({
    queryKey: ["/api/btc/wnsp-btc/etch-status"],
    refetchInterval: 60_000,
  });

  const isOperational = status?.status === "operational";
  const runeId = etchStatus?.rune_id ?? "952733:1958";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top nav bar */}
      <div className="border-b border-slate-800/60 bg-slate-950/90 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/crowdfund">
            <span className="text-white font-bold text-sm tracking-wide cursor-pointer">NexusOS</span>
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/docs"><span className="text-slate-400 hover:text-white transition-colors cursor-pointer">Docs</span></Link>
            <a href="https://www.npmjs.com/package/nexusos-ce-encoder" target="_blank" rel="noreferrer"><span className="text-slate-400 hover:text-white transition-colors cursor-pointer">Packages</span></a>
            <Link href="/developer-matrix"><span className="text-slate-400 hover:text-white transition-colors cursor-pointer">Matrix</span></Link>
            <Link href="/auth">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all">
                <Key className="w-3 h-3" /> Get API Key
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-900/20 text-cyan-400 text-xs mb-6">
            <div className={`w-1.5 h-1.5 rounded-full ${isOperational ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
            {isOperational ? "All systems operational" : "Status loading…"}
          </div>

          <h1 className="text-5xl font-black text-white mb-5 tracking-tight leading-tight">
            Build on the<br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Physics Web</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            NexusOS is a spectral communication protocol built on Maxwell's equations.
            Every API call has a real wavelength, energy cost, and spectral address.
            Two live Bitcoin runes. One developer API.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/auth">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all shadow-lg shadow-cyan-900/30">
                <Key className="w-4 h-4" /> Get API Key — 5,000 sats
              </button>
            </Link>
            <Link href="/docs">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold transition-all">
                <BookOpen className="w-4 h-4" /> Read the Docs
              </button>
            </Link>
          </div>
        </div>

        {/* Live stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {[
            { icon: <Activity className="w-4 h-4" />, label: "Platform", val: status?.status ?? "…", color: "text-green-400" },
            { icon: <Hash className="w-4 h-4" />, label: "WNSP•BTC Rune ID", val: etchStatus?.rune_id ?? runeId, color: "text-orange-400" },
            { icon: <Layers className="w-4 h-4" />, label: "NEXUS•WAVELENGTH", val: "952596:379", color: "text-purple-400" },
            { icon: <BarChart3 className="w-4 h-4" />, label: "Spectral Channels", val: "25,600", color: "text-cyan-400" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <div className={`text-xl font-bold font-mono ${s.color} mb-0.5`}>{s.val}</div>
              <div className="text-[10px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two columns: Install + Quick-start */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">

          {/* Install */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" /> Install the SDK
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400 font-mono">Node.js / TypeScript</span>
                  <a href="https://www.npmjs.com/package/nexusos-ce-encoder" target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300">
                    npm <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <CodeBlock code="npm install nexusos-ce-encoder" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400 font-mono">Python</span>
                  <a href="https://github.com/nexusosdaily-code/NexusOS/tree/main/packages/ce-encoder-py"
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300">
                    GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <CodeBlock code={`pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py`} />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <p className="text-[11px] text-slate-400 mb-3">Both packages implement the same CE algorithm — bit-identical output for any input:</p>
                <CodeBlock lang="js" code={`import { ceEncode } from "nexusos-ce-encoder";
const result = ceEncode("hello");
// { wavelength: 587.3, band: "YELLOW", psiChannel: "Ψ(52,3,V)", energy: 3.38e-19 }`} />
              </div>
            </div>
          </div>

          {/* Quick-start */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" /> Quick-start
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-slate-400 mb-1.5 font-mono">1. Platform health check</p>
                <CodeBlock code={`curl ${BASE}/api/dev/status \\
  -H "Authorization: Bearer nxt_YOUR_KEY"`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-1.5 font-mono">2. CE-encode any text to a spectral address</p>
                <CodeBlock code={`curl "${BASE}/api/dev/ce-encode?text=hello" \\
  -H "Authorization: Bearer nxt_YOUR_KEY"`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-1.5 font-mono">3. Get spectral channel for any user</p>
                <CodeBlock code={`curl ${BASE}/api/dev/physics/alice \\
  -H "Authorization: Bearer nxt_YOUR_KEY"`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-1.5 font-mono">4. Send a message (costs NXT)</p>
                <CodeBlock code={`curl -X POST ${BASE}/api/dev/message \\
  -H "Authorization: Bearer nxt_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"recipientUsername":"alice","content":"hi from the physics web"}'`} />
              </div>
            </div>
          </div>
        </div>

        {/* API Reference */}
        <div className="mb-20">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" /> API Reference
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Base URL: <code className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded text-xs font-mono">{BASE}</code>
            <span className="ml-3">Auth: <code className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded text-xs font-mono">Authorization: Bearer nxt_…</code></span>
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/60 overflow-hidden">
            <div className="px-5 py-3 bg-slate-800/30">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Developer Endpoints</span>
            </div>
            <div className="px-5">
              <EndpointRow method="GET" path="/api/dev/status" desc="Platform health — returns your band, version, endpoint list" free />
              <EndpointRow method="GET" path="/api/dev/wallet" desc="Your NXT balance, sats balance, and last 10 transactions" free />
              <EndpointRow method="GET" path="/api/dev/physics/:username" desc="Spectral channel (Ψ, nm, band) + fee schedule for any user" free />
              <EndpointRow method="GET" path="/api/dev/ce-encode?text=…" desc="CE-encode any UTF-8 text → spectral fingerprint (λ, Ψ, energy)" free />
              <EndpointRow method="GET" path="/api/dev/rune" desc="Live WNSP•BTC and NEXUS•WAVELENGTH rune metadata" free />
              <EndpointRow method="POST" path="/api/dev/message" desc="Send a WNSP message to any registered user" fee="E=hf NXT" />
            </div>
          </div>

          {/* Public (no key) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/60 overflow-hidden mt-4">
            <div className="px-5 py-3 bg-slate-800/30">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Public Endpoints — no key required</span>
            </div>
            <div className="px-5">
              <EndpointRow method="GET" path="/api/platform/status" desc="Platform uptime and rune status — no auth" free />
              <EndpointRow method="GET" path="/api/btc/wnsp-btc/etch-status" desc="WNSP•BTC rune etch status and live wallet balance" free />
              <EndpointRow method="GET" path="/api/rune/info" desc="NEXUS•WAVELENGTH mint progress and rune metadata" free />
            </div>
          </div>
        </div>

        {/* Features grid */}
        <div className="mb-20">
          <h2 className="text-xl font-bold text-white mb-8 text-center">What makes this different</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="w-5 h-5 text-yellow-400" />,
                title: "Physics-priced fees",
                body: "Every API action costs NXT determined by E=hf. Your spectral band (wavelength) sets your fee tier. Shorter wavelength = higher authority = higher fees.",
              },
              {
                icon: <Cpu className="w-5 h-5 text-cyan-400" />,
                title: "Spectral addressing",
                body: "Every user, message, and document gets a Ψ channel (ψ = WDM×OAM×Pol). 25,600 orthogonal channels. DNS-free routing via wnsp:// URIs.",
              },
              {
                icon: <Shield className="w-5 h-5 text-purple-400" />,
                title: "Two live Bitcoin runes",
                body: "NEXUS•WAVELENGTH (952596:379) — open mint, 21T supply. WNSP•BTC (952733:1958) — 100% premined, 21B supply. Both on Bitcoin mainnet.",
              },
              {
                icon: <Code2 className="w-5 h-5 text-green-400" />,
                title: "CE encoding",
                body: "Character encoding that maps UTF-8 → visible light spectrum (380–780 nm). Published on npm and pip. Bit-identical across JS and Python.",
              },
              {
                icon: <Wifi className="w-5 h-5 text-pink-400" />,
                title: "WavelengthScript",
                body: "A physics-native language that compiles to WNSP bytecode. The VM executes in-browser. Each Ψ channel is a spectral register.",
              },
              {
                icon: <Globe className="w-5 h-5 text-blue-400" />,
                title: "AGPL-3.0",
                body: "Core protocol, both runes, and all packages are open source. The hardware spec (SNIC, PHR-1) was publicly disclosed 2026-05-16.",
              },
            ].map(f => (
              <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-2">{f.title}</h3>
                <p className="text-[12px] text-slate-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/10 via-slate-900 to-purple-900/10 p-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to build?</h2>
          <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
            One API key unlocks all endpoints. 5,000 sats flat fee. No monthly subscription. Pay per action with spectral physics fees.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/auth">
              <button className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-900/40">
                <Key className="w-4 h-4" /> Get your API Key
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/ce-code-writer">
              <button className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold transition-all">
                <Code2 className="w-4 h-4" /> Try CE Encoder live
              </button>
            </Link>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-[11px] text-slate-600 flex-wrap gap-3">
          <span>NexusOS · WNSP Protocol · AGPL-3.0</span>
          <div className="flex items-center gap-4">
            <a href="https://www.npmjs.com/package/nexusos-ce-encoder" target="_blank" rel="noreferrer" className="hover:text-slate-400">npm</a>
            <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank" rel="noreferrer" className="hover:text-slate-400">GitHub</a>
            <Link href="/hardware-spec"><span className="hover:text-slate-400 cursor-pointer">Hardware Spec</span></Link>
            <Link href="/oscillating-quanta"><span className="hover:text-slate-400 cursor-pointer">First Principles</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
