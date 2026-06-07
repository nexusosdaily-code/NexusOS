import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChannelConnect } from "@/components/channel-connect";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Gem, Bitcoin, Zap, Shield, Cpu, Globe2,
  TrendingUp, Lock, Flame, Coins, ArrowRight, CheckCircle2,
  ExternalLink, Hash, Layers, Activity,
} from "lucide-react";

function Stat({ label, val, sub, color = "text-cyan-300" }: { label: string; val: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
      <div className={`text-2xl font-bold font-mono ${color}`}>{val}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function Row({ label, val, mono = false }: { label: string; val: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className={`text-white text-sm ${mono ? "font-mono" : ""}`}>{val}</span>
    </div>
  );
}

export default function RuneEtchingPage() {
  const { data } = useQuery<any>({ queryKey: ["/api/rune/info"], refetchInterval: 30_000 });

  const pct = data ? ((data.mintCount / data.maxMints) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/nexus-command">
            <button className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Gem className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">NEXUS•WAVELENGTH</h1>
              <p className="text-xs text-slate-400">Bitcoin Rune · NexusOS Canonical Token</p>
            </div>
          </div>
          <div className="flex-1" />
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Rune Protocol</Badge>
        </div>

        <ChannelConnect label="Top up ⚡" />

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/20 via-slate-900 to-cyan-900/10 p-8 mb-6">
          <div className="absolute inset-0 opacity-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="absolute text-6xl font-mono text-purple-400 select-none"
                style={{ left: `${i * 14}%`, top: `${(i % 3) * 30}%`, transform: "rotate(-15deg)" }}>Ψ</div>
            ))}
          </div>
          <div className="relative">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-3xl">Ψ</div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-white mb-1">NEXUS•WAVELENGTH</div>
                <div className="text-slate-400 text-sm mb-3">The canonical Bitcoin Rune of the NexusOS ecosystem. Etched on Bitcoin mainnet at block 952,590 — permanently sealed on-chain. Each token represents a spectral wavelength unit in the WNSP communication layer.</div>
                <div className="flex flex-wrap gap-2">
                  {["Bitcoin Native", "UTXO-based", "No Ordinals required", "AGPL-3.0", "Physics-signed"].map(t => (
                    <Badge key={t} className="bg-slate-800/80 text-slate-300 border-slate-700 text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live mint progress */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />Mint Progress
            </div>
            <div className="text-xs font-mono text-slate-500">{data?.mintCount ?? 0} / {data?.maxMints ?? 21000} minted</div>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 font-mono">
            <span>0</span><span>{pct}% minted</span><span>21,000 max</span>
          </div>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Total Supply" val="21M" sub="21,000,000 Ψ" color="text-purple-300" />
          <Stat label="Per Mint" val="1,000" sub="NEXUS•WAVELENGTH" color="text-cyan-300" />
          <Stat label="Mint Cost" val="100 NXT" sub="≈ spectral energy" color="text-amber-300" />
          <Stat label="Stake Yield" val="150 NXT" sub="per epoch / 1K Ψ" color="text-green-300" />
        </div>

        {/* Two-column spec */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-slate-900/60 border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-sm text-white">Rune Specification</span>
            </div>
            <Row label="Rune Name"    val="NEXUS•WAVELENGTH" mono />
            <Row label="Rune ID"      val={data?.runeId ?? "952590:379"} mono />
            <Row label="Symbol"       val="Ψ (Psi)" mono />
            <Row label="Decimals"     val="8" mono />
            <Row label="Total Supply" val="21,000,000 Ψ" mono />
            <Row label="Etch TX" val={<a href="https://mempool.space/tx/8e1614818d96e494bbde4d90b57ef7ce596aebee50b15b48c132ed8ece3ae11c" target="_blank" rel="noreferrer"
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-[11px]">
              8e1614…3ae11c <ExternalLink className="w-3 h-3" />
            </a>} />
            <Row label="Etched Block" val={<a href="https://mempool.space/block/952590" target="_blank" rel="noreferrer"
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1">
              952,590 <ExternalLink className="w-3 h-3" />
            </a>} />
            <Row label="Protocol"     val={<Badge className="bg-purple-500/15 text-purple-300 border-purple-500/20 text-[10px]">Runes (OP_RETURN)</Badge>} />
            <Row label="View on Ordiscan" val={<a href="https://ordiscan.com/rune/NEXUS%E2%80%A2WAVELENGTH" target="_blank" rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              ordiscan.com <ExternalLink className="w-3 h-3" />
            </a>} />
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-sm text-white">Token Economics</span>
            </div>
            <Row label="Mint Allocation" val="21,000 × 1,000 Ψ" mono />
            <Row label="Mint Cost"        val="100 NXT / mint" mono />
            <Row label="Staking Yield"    val="150 NXT / epoch" mono />
            <Row label="Epoch Length"     val="24 hours" mono />
            <Row label="Marketplace fee"  val="2.5% in NXT" mono />
            <Row label="Burn rate"        val="1.25% per sale" mono />
            <Row label="Treasury"         val="1.25% per sale" mono />
          </Card>
        </div>

        {/* Why Runes */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-white">Why Runes over BRC-20?</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <Bitcoin className="w-4 h-4 text-orange-400" />, title: "UTXO-native", desc: "Lives directly in Bitcoin UTXOs. No inscription indexer, no ord nodes required." },
              { icon: <Zap className="w-4 h-4 text-yellow-400" />, title: "Cheaper transfers", desc: "Encoded in OP_RETURN. Lower sat-dust, fewer UTXOs, faster propagation." },
              { icon: <Lock className="w-4 h-4 text-green-400" />, title: "Atomic swaps ready", desc: "PSBT-compatible. Trustless marketplace trades without custodial bridges." },
            ].map(f => (
              <div key={f.title} className="bg-slate-800/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">{f.icon}<span className="text-white text-xs font-semibold">{f.title}</span></div>
                <div className="text-slate-400 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* On-Chain Proof */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-sm text-white">On-Chain Proof</span>
            <Badge className="ml-auto bg-green-500/15 text-green-300 border-green-500/20 text-[10px]">✓ Live on Bitcoin</Badge>
          </div>
          <div className="space-y-3">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs">WNSP.btc Inscription</span>
                <span className="text-green-400 text-[10px] font-mono">Ordinals · mainnet</span>
              </div>
              <div className="font-mono text-[11px] text-slate-300 break-all mb-2">
                ee8f6461ea2e39577b83350cb33c7bed0ae51ab1161a131369b054bb12939542i0
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="https://ord.io/ee8f6461ea2e39577b83350cb33c7bed0ae51ab1161a131369b054bb12939542i0"
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 bg-purple-500/10 rounded px-2 py-1">
                  ord.io <ExternalLink className="w-3 h-3" />
                </a>
                <a href="https://ordinals.com/inscription/ee8f6461ea2e39577b83350cb33c7bed0ae51ab1161a131369b054bb12939542i0"
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 bg-orange-500/10 rounded px-2 py-1">
                  ordinals.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs">NEXUS•WAVELENGTH Rune Etch TX</span>
                <span className="text-green-400 text-[10px] font-mono">Runes · block 952,590</span>
              </div>
              <div className="font-mono text-[11px] text-slate-300 break-all mb-2">
                8e1614818d96e494bbde4d90b57ef7ce596aebee50b15b48c132ed8ece3ae11c
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="https://mempool.space/tx/8e1614818d96e494bbde4d90b57ef7ce596aebee50b15b48c132ed8ece3ae11c"
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 rounded px-2 py-1">
                  mempool.space <ExternalLink className="w-3 h-3" />
                </a>
                <a href="https://ordiscan.com/rune/NEXUS%E2%80%A2WAVELENGTH"
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 rounded px-2 py-1">
                  ordiscan.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/rune-mint">
            <Card className="bg-purple-900/20 border-purple-500/30 p-4 hover:border-purple-400/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-purple-400" />
                <span className="text-white font-semibold text-sm">Mint Runes</span>
                <ArrowRight className="w-3 h-3 text-slate-500 ml-auto" />
              </div>
              <div className="text-slate-400 text-xs">Pay 100 NXT → receive 1,000 NEXUS•WAVELENGTH to your Bitcoin address</div>
            </Card>
          </Link>
          <Link href="/rune-staking">
            <Card className="bg-cyan-900/10 border-cyan-500/20 p-4 hover:border-cyan-400/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-semibold text-sm">Stake Runes</span>
                <ArrowRight className="w-3 h-3 text-slate-500 ml-auto" />
              </div>
              <div className="text-slate-400 text-xs">Stake your Rune UTXO → earn 150 NXT per 1,000 Ψ per epoch</div>
            </Card>
          </Link>
          <Link href="/marketplace">
            <Card className="bg-amber-900/10 border-amber-500/20 p-4 hover:border-amber-400/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-white font-semibold text-sm">Trade on Market</span>
                <ArrowRight className="w-3 h-3 text-slate-500 ml-auto" />
              </div>
              <div className="text-slate-400 text-xs">Buy & sell NEXUS•WAVELENGTH on the NexusOS Marketplace</div>
            </Card>
          </Link>
        </div>

      </div>
    </div>
  );
}
