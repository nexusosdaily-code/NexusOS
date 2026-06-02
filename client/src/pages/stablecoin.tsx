import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, DollarSign, Bitcoin, Zap, Lock, TrendingUp,
  Shield, RefreshCw, Activity, ChevronRight, Layers,
} from "lucide-react";

type StablecoinStats = {
  ok: boolean;
  token: string;
  peg: number;
  btcUsd: number;
  satUsd: number;
  nxtUsd: number;
  treasuryNxt: number;
  treasurySats: number;
  collateralUsd: number;
  colRatio: number;
  maxMintUsd: number;
  circulatingSupply: number;
  collateralRatioPct: number;
  mechanism: string;
};

function fmtUsd(n: number, decimals = 2) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(decimals)}`;
}

function fmtNxt(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(3)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(3)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(3)}K`;
  return n.toFixed(2);
}

function fmtSats(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(3)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(3)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(3)}M`;
  return n.toLocaleString();
}

function ReserveBar({ filled, label, color }: { filled: number; label: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span style={{ color }}>{(filled * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(filled * 100, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

export default function StablecoinPage() {
  const { data: stats, isLoading, refetch, dataUpdatedAt } = useQuery<StablecoinStats>({
    queryKey: ["/api/stablecoin/stats"],
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const utilisation = stats ? stats.circulatingSupply / stats.maxMintUsd : 0;
  const lastUpdate  = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8"
      data-testid="page-stablecoin">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Nav ── */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" />Back
            </button>
          </Link>
          <button onClick={() => refetch()} className="text-gray-600 hover:text-gray-400 flex items-center gap-1 text-xs">
            <RefreshCw className="w-3 h-3" />Updated {lastUpdate}
          </button>
        </div>

        {/* ── Hero ── */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-2"
            style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
            <DollarSign className="w-3 h-3" />WNUSD · Wavelength Network USD
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Bitcoin-Backed Stablecoin
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
            Every WNUSD is backed by the NXT treasury reserve — 500M NXT → 500B sats
            — whose dollar value floats with Bitcoin. The swap rate is the liquidation floor.
          </p>
        </div>

        {/* ── Loading state ── */}
        {isLoading && (
          <div className="text-center text-gray-500 py-12">
            <Activity className="w-6 h-6 mx-auto mb-2 animate-pulse" />
            Fetching reserve data…
          </div>
        )}

        {stats && (
          <>
            {/* ── Reserve pillars ── */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-slate-900/60 border-slate-700/50 p-4 text-center">
                <div className="text-[10px] text-orange-400/70 uppercase tracking-wider mb-1">BTC / USD</div>
                <div className="text-xl font-bold text-white font-mono">
                  ${stats.btcUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">1 sat = ${stats.satUsd.toFixed(7)}</div>
              </Card>
              <Card className="bg-slate-900/60 border-slate-700/50 p-4 text-center">
                <div className="text-[10px] text-purple-400/70 uppercase tracking-wider mb-1">NXT / USD</div>
                <div className="text-xl font-bold text-white font-mono">${stats.nxtUsd.toFixed(4)}</div>
                <div className="text-[10px] text-gray-500 mt-1">= BTC ÷ 100,000</div>
              </Card>
              <Card className="bg-slate-900/60 border-slate-700/50 p-4 text-center">
                <div className="text-[10px] text-green-400/70 uppercase tracking-wider mb-1">WNUSD peg</div>
                <div className="text-xl font-bold text-green-400 font-mono">$1.0000</div>
                <div className="text-[10px] text-gray-500 mt-1">Target price</div>
              </Card>
            </div>

            {/* ── Treasury Reserve ── */}
            <Card className="bg-slate-900/60 border-slate-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-amber-400" />
                <h2 className="text-white font-semibold">NXT Treasury Reserve</h2>
                <span className="ml-auto text-[10px] text-gray-500 bg-slate-800 px-2 py-0.5 rounded">Genesis wallet</span>
              </div>

              <div className="space-y-4">
                {/* Flow diagram */}
                <div className="flex items-center justify-between text-xs bg-slate-800/40 rounded-xl p-4">
                  <div className="text-center">
                    <div className="text-purple-300 font-mono font-bold text-base">{fmtNxt(stats.treasuryNxt)} NXT</div>
                    <div className="text-gray-500 mt-0.5">Treasury</div>
                  </div>
                  <div className="flex flex-col items-center text-gray-600">
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-[9px]">×1,000</span>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-300 font-mono font-bold text-base">{fmtSats(stats.treasurySats)} sats</div>
                    <div className="text-gray-500 mt-0.5">Sats equivalent</div>
                  </div>
                  <div className="flex flex-col items-center text-gray-600">
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-[9px]">×${stats.satUsd.toFixed(7)}</span>
                  </div>
                  <div className="text-center">
                    <div className="text-emerald-300 font-mono font-bold text-base">{fmtUsd(stats.collateralUsd)}</div>
                    <div className="text-gray-500 mt-0.5">USD collateral</div>
                  </div>
                </div>

                {/* Breakdown rows */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-gray-400">Treasury NXT</span>
                    <span className="font-mono text-purple-300">{fmtNxt(stats.treasuryNxt)} NXT</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-gray-400">Sats equivalent (×1,000)</span>
                    <span className="font-mono text-yellow-300">⚡ {fmtSats(stats.treasurySats)} sats</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-gray-400">USD collateral (live)</span>
                    <span className="font-mono text-emerald-300 font-bold">{fmtUsd(stats.collateralUsd)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-gray-400">Collateral ratio</span>
                    <span className="font-mono text-white">{stats.collateralRatioPct}% over-collateralised</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-400 font-semibold">Max WNUSD supply</span>
                    <span className="font-mono text-green-300 font-bold text-sm">{fmtUsd(stats.maxMintUsd)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Protocol stats ── */}
            <Card className="bg-slate-900/60 border-slate-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h2 className="text-white font-semibold">Protocol Stats</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-800/40 rounded-lg p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Circulating supply</div>
                  <div className="text-2xl font-bold text-white font-mono">{fmtUsd(stats.circulatingSupply)}</div>
                  <div className="text-[10px] text-gray-600 mt-1">WNUSD in circulation</div>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Available to mint</div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">{fmtUsd(stats.maxMintUsd - stats.circulatingSupply)}</div>
                  <div className="text-[10px] text-gray-600 mt-1">at 150% ratio</div>
                </div>
              </div>

              <div className="space-y-3">
                <ReserveBar filled={utilisation} label="Mint utilisation" color="#22c55e" />
                <ReserveBar
                  filled={stats.collateralUsd > 0 ? Math.min(stats.collateralUsd / 1e9, 1) : 0}
                  label="Collateral vs $1B ceiling"
                  color="#a855f7"
                />
              </div>

              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                  style={{ background: "rgba(34,197,94,0.10)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.20)" }}>
                  <Shield className="w-3 h-3" />
                  {utilisation === 0 ? "Fully collateralised · Mint not yet live" : `${(utilisation * 100).toFixed(1)}% utilised`}
                </div>
              </div>
            </Card>

            {/* ── How it works ── */}
            <Card className="bg-slate-900/60 border-slate-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-purple-400" />
                <h2 className="text-white font-semibold">The 1000-sat swap mechanism</h2>
              </div>

              <div className="space-y-3">
                {[
                  {
                    step: "01", color: "#f59e0b", icon: Lock,
                    title: "NXT treasury is the reserve",
                    body: `${fmtNxt(stats.treasuryNxt)} NXT locked in the genesis wallet. It cannot be diluted — total supply is capped at 21B NXT by protocol.`,
                  },
                  {
                    step: "02", color: "#facc15", icon: Zap,
                    title: "1 NXT = 1,000 sats · always",
                    body: `The swap rate is the liquidation floor. Every NXT can be redeemed for 1,000 sats. This makes ${fmtSats(stats.treasurySats)} sats the hard collateral floor.`,
                  },
                  {
                    step: "03", color: "#f97316", icon: Bitcoin,
                    title: "Sats × BTC spot price = live USD backing",
                    body: `${fmtSats(stats.treasurySats)} sats × $${stats.satUsd.toFixed(7)}/sat = ${fmtUsd(stats.collateralUsd)} today. This number moves with Bitcoin — not with NexusOS decisions.`,
                  },
                  {
                    step: "04", color: "#22c55e", icon: DollarSign,
                    title: "WNUSD minted at 150% collateral ratio",
                    body: `For every $1.50 of BTC-denominated collateral, $1 of WNUSD can be minted. Max supply today: ${fmtUsd(stats.maxMintUsd)}. If BTC drops and ratio falls below 150%, positions are liquidated back to sats.`,
                  },
                  {
                    step: "05", color: "#06b6d4", icon: TrendingUp,
                    title: "As BTC rises, so does the mint ceiling",
                    body: "No governance vote needed to expand supply — the ceiling is purely mathematical. BTC appreciation → more sats worth more → larger WNUSD capacity.",
                  },
                ].map(({ step, color, icon: Icon, title, body }) => (
                  <div key={step} className="flex gap-4 p-3 rounded-lg bg-slate-800/30">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                      {step}
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold flex items-center gap-1.5 mb-0.5">
                        <Icon className="w-3.5 h-3.5" style={{ color }} />{title}
                      </div>
                      <div className="text-gray-400 text-xs leading-relaxed">{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Scenario table ── */}
            <Card className="bg-slate-900/60 border-slate-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h2 className="text-white font-semibold">BTC price scenarios — WNUSD capacity</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-slate-800">
                      <th className="text-left py-2 font-normal">BTC price</th>
                      <th className="text-right py-2 font-normal">1 NXT (USD)</th>
                      <th className="text-right py-2 font-normal">Collateral</th>
                      <th className="text-right py-2 font-normal">Max WNUSD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[30_000, 50_000, 70_000, 100_000, 150_000, 200_000].map((price) => {
                      const sat  = price / 100_000_000;
                      const nxt  = sat * 1_000;
                      const col  = stats.treasurySats * sat;
                      const mint = Math.min(col / 1.5, 500_000_000);
                      const isCur = Math.abs(price - stats.btcUsd) < 5_000;
                      return (
                        <tr key={price}
                          className={`border-b border-slate-800/50 ${isCur ? "bg-yellow-500/5" : ""}`}>
                          <td className={`py-2 font-mono ${isCur ? "text-yellow-300 font-semibold" : "text-gray-300"}`}>
                            ${price.toLocaleString()}{isCur && " ◄"}
                          </td>
                          <td className="py-2 text-right font-mono text-purple-300">${nxt.toFixed(4)}</td>
                          <td className="py-2 text-right font-mono text-emerald-300">{fmtUsd(col)}</td>
                          <td className="py-2 text-right font-mono text-green-400 font-semibold">{fmtUsd(mint)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-[10px] text-gray-600">
                Collateral = {fmtSats(stats.treasurySats)} sats × BTC spot. Max WNUSD = collateral ÷ 1.5, capped at $500M.
              </div>
            </Card>

            {/* ── Mint CTA ── */}
            <Card className="border-green-500/20 p-6 text-center"
              style={{ background: "rgba(34,197,94,0.04)" }}>
              <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-white font-semibold text-lg mb-1">WNUSD minting — coming soon</div>
              <div className="text-gray-400 text-sm mb-3">
                Deposit NXT as collateral → receive WNUSD at the live BTC-derived rate.
                Redeem any time at the 1,000-sat floor.
              </div>
              <div className="flex flex-wrap justify-center gap-3 text-xs">
                <Link href="/lightning-wallet">
                  <button className="px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />Lightning wallet
                  </button>
                </Link>
                <Link href="/wallet">
                  <button className="px-4 py-2 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                    NXT wallet
                  </button>
                </Link>
                <Link href="/governance">
                  <button className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">
                    Governance
                  </button>
                </Link>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
