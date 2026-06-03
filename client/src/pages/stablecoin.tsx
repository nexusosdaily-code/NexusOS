import { Link } from "wouter";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, DollarSign, Bitcoin, Zap, Lock, TrendingUp,
  Shield, RefreshCw, Activity, ChevronRight, Layers,
  PlusCircle, MinusCircle, History, AlertTriangle, CheckCircle2,
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
  fullSupplyNxt: number;
  fullSupplySats: number;
  fullSupplyUsd: number;
  fullSupplyMaxMint: number;
  mechanism: string;
};

type WnusdPosition = {
  id: string;
  collateral_sats: number;
  nxt_fee_sent: string;
  wnusd_minted: string;
  status: string;
  col_ratio_pct: string;
  btc_usd_at_mint: string;
  opened_at: string;
  liveColRatioPct: string;
  liquidationSats: number;
  satUsd: number;
  btcUsd: number;
};

type WnusdTx = {
  id: string;
  type: string;
  sats_delta: number;
  wnusd_delta: string;
  nxt_fee: string;
  col_ratio_pct: string;
  btc_usd_at_time: string;
  created_at: string;
};

type PositionsData = {
  ok: boolean;
  positions: WnusdPosition[];
  history: WnusdTx[];
  btcUsd: number;
  satUsd: number;
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

const SATS_PER_NXT = 1_000;
const MINT_FEE_RATE = 0.005;
const COL_RATIO = 1.5;

function preview(satAmount: number, satUsd: number) {
  if (!satAmount || !satUsd) return null;
  const nxtEquiv = satAmount / SATS_PER_NXT;
  const nxtFee   = nxtEquiv * MINT_FEE_RATE;
  const colUsd   = satAmount * satUsd;
  const wnusd    = colUsd / COL_RATIO;
  return { nxtFee, wnusd, colUsd };
}

function colColor(pct: number) {
  if (pct >= 200) return "#22c55e";
  if (pct >= 150) return "#eab308";
  return "#ef4444";
}

export default function StablecoinPage() {
  const qc = useQueryClient();
  const [tab, setTab]       = useState<"mint" | "positions" | "history">("mint");
  const [satInput, setSatInput] = useState("");
  const [mintMsg, setMintMsg]   = useState<{ ok: boolean; text: string } | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: stats, isLoading, refetch, dataUpdatedAt } = useQuery<StablecoinStats>({
    queryKey: ["/api/stablecoin/stats"],
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const { data: posData, refetch: refetchPos } = useQuery<PositionsData>({
    queryKey: ["/api/wnusd/positions"],
    refetchInterval: 60_000,
    retry: false,
  });

  const mintMut = useMutation({
    mutationFn: async (satAmount: number) => {
      const r = await fetch("/api/wnusd/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ satAmount }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Mint failed");
      return d;
    },
    onSuccess: (d) => {
      setMintMsg({ ok: true, text: `Minted ${parseFloat(d.wnusdMinted).toFixed(4)} WNUSD ✓  NXT fee: ${parseFloat(d.nxtFee).toFixed(4)} → Orbital Treasury` });
      setSatInput("");
      qc.invalidateQueries({ queryKey: ["/api/wnusd/positions"] });
      qc.invalidateQueries({ queryKey: ["/api/stablecoin/stats"] });
    },
    onError: (e: any) => setMintMsg({ ok: false, text: e.message }),
  });

  const redeemMut = useMutation({
    mutationFn: async (positionId: string) => {
      const r = await fetch("/api/wnusd/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Redeem failed");
      return d;
    },
    onSuccess: (d) => {
      setRedeemMsg({ ok: true, text: `Redeemed — ${d.satsReturned.toLocaleString()} sats returned to your lightning wallet` });
      qc.invalidateQueries({ queryKey: ["/api/wnusd/positions"] });
    },
    onError: (e: any) => setRedeemMsg({ ok: false, text: e.message }),
  });

  const satAmt    = parseInt(satInput.replace(/[^0-9]/g, ""), 10) || 0;
  const pre       = stats ? preview(satAmt, stats.satUsd) : null;
  const utilisation = stats ? stats.circulatingSupply / stats.maxMintUsd : 0;
  const lastUpdate  = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";
  const activePos   = posData?.positions.filter(p => p.status === "active") ?? [];
  const allPos      = posData?.positions ?? [];
  const history     = posData?.history ?? [];

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
            500M NXT genesis treasury = 500B sats today. When all 21B NXT are consumed,
            the system holds <span className="text-yellow-300 font-semibold">21 trillion sats</span> — the total collateral ceiling.
            Dollar value floats with Bitcoin. The 1,000-sat swap rate is the liquidation floor.
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

            {/* ── Full-supply ceiling ── */}
            <Card className="p-5 border-yellow-500/25"
              style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.07) 0%, rgba(251,191,36,0.03) 100%)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h2 className="text-white font-semibold">System ceiling — when all 21B NXT are consumed</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center bg-slate-900/50 rounded-lg p-3">
                  <div className="text-[10px] text-purple-400/80 uppercase tracking-wider mb-1">Total NXT supply</div>
                  <div className="text-2xl font-bold text-purple-300 font-mono">21B</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">hard cap · protocol-enforced</div>
                </div>
                <div className="text-center bg-slate-900/50 rounded-lg p-3">
                  <div className="text-[10px] text-yellow-400/80 uppercase tracking-wider mb-1">⚡ Total sats</div>
                  <div className="text-2xl font-bold text-yellow-300 font-mono">21T</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">21,000,000,000,000 sats</div>
                </div>
                <div className="text-center bg-slate-900/50 rounded-lg p-3">
                  <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider mb-1">USD at BTC ${stats.btcUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                  <div className="text-2xl font-bold text-emerald-300 font-mono">
                    {fmtUsd(stats.fullSupplyUsd)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">= NXT market cap</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm"
                style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.18)" }}>
                <span className="text-gray-300">Max WNUSD at full supply <span className="text-gray-500 text-xs">(÷ 1.5 collateral ratio)</span></span>
                <span className="font-bold font-mono text-yellow-300 text-lg">{fmtUsd(stats.fullSupplyMaxMint)}</span>
              </div>
              <div className="mt-2 text-[10px] text-gray-600 text-center">
                21B NXT × 1,000 sats/NXT = 21T sats · same math as Bitcoin's 21M BTC × 1,000 sat/NXT swap rate
              </div>
            </Card>

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

            {/* ── Ceiling identity callout ── */}
            <Card className="p-5 border-orange-500/25 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(251,146,60,0.06) 0%, rgba(239,68,68,0.03) 100%)" }}>
              <div className="text-[10px] text-orange-400/60 uppercase tracking-widest mb-2 font-mono">The ceiling identity</div>
              <div className="text-center space-y-1 mb-4">
                <div className="font-mono text-white/70 text-sm">
                  <span className="text-purple-300 font-bold">21B NXT</span>
                  <span className="text-white/30 mx-2">×</span>
                  <span className="text-yellow-300">1,000 sats/NXT</span>
                  <span className="text-white/30 mx-2">=</span>
                  <span className="text-yellow-400 font-bold">21T sats</span>
                </div>
                <div className="font-mono text-white/70 text-sm">
                  <span className="text-yellow-400 font-bold">21T sats</span>
                  <span className="text-white/30 mx-2">×</span>
                  <span className="text-orange-300">BTC price per sat</span>
                  <span className="text-white/30 mx-2">=</span>
                  <span className="text-green-300 font-bold">WNUSD ceiling</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 italic">
                  The ceiling is not fixed — it scales with every sat Bitcoin appreciates
                </div>
              </div>

              {/* Big three scenarios */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "Today", btc: stats.btcUsd, highlight: true, tag: "live" },
                  { label: "BTC $1M", btc: 1_000_000, highlight: false, tag: "cycle peak" },
                  { label: "BTC $100M", btc: 100_000_000, highlight: false, tag: ">$10T zone" },
                ].map(({ label, btc, highlight, tag }) => {
                  const sat = btc / 100_000_000;
                  const col21t = 21_000_000_000_000 * sat;
                  return (
                    <div key={label} className={`rounded-lg p-3 text-center ${highlight ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-slate-800/40"}`}>
                      <div className={`text-[9px] uppercase tracking-wider mb-1 ${highlight ? "text-yellow-400/70" : "text-gray-600"}`}>{label}</div>
                      <div className={`text-lg font-bold font-mono ${highlight ? "text-yellow-300" : col21t >= 1e12 ? "text-red-300" : "text-emerald-300"}`}>
                        {col21t >= 1e12 ? `$${(col21t / 1e12).toFixed(1)}T` : col21t >= 1e9 ? `$${(col21t / 1e9).toFixed(1)}B` : `$${(col21t / 1e6).toFixed(0)}M`}
                      </div>
                      <div className={`text-[9px] mt-0.5 ${highlight ? "text-yellow-400/50" : "text-gray-600"}`}>{tag}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ── Full ceiling trajectory ── */}
            <Card className="bg-slate-900/60 border-slate-700/50 p-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h2 className="text-white font-semibold">Full ceiling trajectory — 21T sats × BTC price</h2>
              </div>
              <div className="text-[10px] text-gray-500 mb-4">
                21B NXT at full supply = 21T sats. Dollar ceiling = 21T × (BTC ÷ 100,000,000). Uncapped — no governance vote needed to grow.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-slate-800">
                      <th className="text-left py-2 font-normal">BTC / USD</th>
                      <th className="text-right py-2 font-normal">1 NXT</th>
                      <th className="text-right py-2 font-normal">21T sats ceiling</th>
                      <th className="text-right py-2 font-normal">Max WNUSD (÷1.5)</th>
                      <th className="text-right py-2 font-normal"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { btc: 70_000,       tag: "" },
                      { btc: 100_000,      tag: "" },
                      { btc: 250_000,      tag: "" },
                      { btc: 500_000,      tag: "" },
                      { btc: 1_000_000,    tag: "BTC $1M" },
                      { btc: 5_000_000,    tag: "" },
                      { btc: 10_000_000,   tag: "" },
                      { btc: 47_619_048,   tag: "→ $10T crossover" },
                      { btc: 100_000_000,  tag: "BTC $100M" },
                    ].map(({ btc, tag }) => {
                      const sat     = btc / 100_000_000;
                      const nxtUsd  = sat * 1_000;
                      const col21t  = 21_000_000_000_000 * sat;
                      const maxMint = col21t / 1.5;
                      const isCur   = Math.abs(btc - stats.btcUsd) < btc * 0.15;
                      const is10t   = btc === 47_619_048;
                      const is100m  = btc === 100_000_000;

                      function fmtBig(n: number) {
                        if (n >= 1e15) return `$${(n / 1e15).toFixed(2)}Q`;
                        if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
                        if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
                        if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
                        return `$${n.toFixed(0)}`;
                      }

                      return (
                        <tr key={btc}
                          className={`border-b border-slate-800/50 ${isCur ? "bg-yellow-500/5" : is10t ? "bg-red-500/5" : is100m ? "bg-orange-500/5" : ""}`}>
                          <td className={`py-2 font-mono font-semibold ${isCur ? "text-yellow-300" : is10t ? "text-red-300" : is100m ? "text-orange-300" : "text-gray-400"}`}>
                            {btc >= 1_000_000
                              ? `$${(btc / 1_000_000).toFixed(0)}M`
                              : `$${btc.toLocaleString()}`}
                            {isCur && " ◄ NOW"}
                          </td>
                          <td className="py-2 text-right font-mono text-purple-300">
                            ${nxtUsd < 1 ? nxtUsd.toFixed(4) : nxtUsd.toFixed(2)}
                          </td>
                          <td className={`py-2 text-right font-mono font-bold ${col21t >= 1e13 ? "text-orange-300" : col21t >= 1e12 ? "text-red-300" : col21t >= 1e11 ? "text-amber-300" : "text-emerald-300"}`}>
                            {fmtBig(col21t)}
                          </td>
                          <td className={`py-2 text-right font-mono ${col21t >= 1e12 ? "text-red-300/80" : "text-green-400"}`}>
                            {fmtBig(maxMint)}
                          </td>
                          <td className="py-2 text-right">
                            {is10t && <span className="text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">&gt;$10T</span>}
                            {is100m && <span className="text-[9px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded font-mono">$21T</span>}
                            {isCur && <span className="text-[9px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded font-mono">live</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-2 rounded bg-yellow-500/5 border border-yellow-500/15">
                  <div className="text-yellow-300 font-bold font-mono">{fmtUsd(stats.fullSupplyUsd)}</div>
                  <div className="text-gray-600 mt-0.5">ceiling today (BTC ${stats.btcUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })})</div>
                </div>
                <div className="p-2 rounded bg-red-500/5 border border-red-500/15">
                  <div className="text-red-300 font-bold font-mono">$10T</div>
                  <div className="text-gray-600 mt-0.5">crossover at BTC ~$48M</div>
                </div>
                <div className="p-2 rounded bg-orange-500/5 border border-orange-500/15">
                  <div className="text-orange-300 font-bold font-mono">$21T</div>
                  <div className="text-gray-600 mt-0.5">ceiling at BTC $100M</div>
                </div>
              </div>
            </Card>

            {/* ── WNUSD Liquidity Panel ── */}
            <Card className="border-green-500/25 overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.05) 0%, rgba(15,23,42,1) 60%)" }}>

              {/* Tab bar */}
              <div className="flex border-b border-slate-800">
                {([
                  { id: "mint",      label: "Mint WNUSD",  icon: PlusCircle },
                  { id: "positions", label: `Positions (${activePos.length})`, icon: Lock },
                  { id: "history",   label: "History",     icon: History },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setTab(id)}
                    data-testid={`tab-wnusd-${id}`}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors
                      ${tab === id ? "text-green-400 border-b-2 border-green-500 bg-green-500/5" : "text-gray-500 hover:text-gray-300"}`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>

              <div className="p-5">

                {/* ── MINT TAB ── */}
                {tab === "mint" && (
                  <div className="space-y-4">
                    <div className="text-xs text-gray-400 leading-relaxed">
                      Lock sats as collateral at <span className="text-white">150% ratio</span> to mint WNUSD.
                      A <span className="text-yellow-300">0.5% NXT fee</span> is deposited to the{" "}
                      <Link href="/orbital-treasury"><span className="text-amber-400 hover:underline cursor-pointer">Orbital Treasury</span></Link>.
                      NXT is never burned — it funds the protocol.
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider">Sats to lock as collateral</label>
                      <div className="flex gap-2 mt-1">
                        <input
                          data-testid="input-wnusd-sats"
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 100000"
                          value={satInput}
                          onChange={e => { setSatInput(e.target.value); setMintMsg(null); }}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-green-500/50"
                        />
                        <div className="flex gap-1">
                          {[100_000, 1_000_000, 10_000_000].map(v => (
                            <button key={v} onClick={() => setSatInput(String(v))}
                              className="px-2 py-1 text-[10px] bg-slate-800 border border-slate-700 rounded text-gray-400 hover:text-white hover:border-slate-500 transition-colors">
                              {v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1_000}K`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live preview */}
                    {pre && satAmt >= 10_000 && (
                      <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Collateral value</span>
                          <span className="font-mono text-white">${pre.colUsd.toFixed(4)} USD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">WNUSD you receive</span>
                          <span className="font-mono text-green-300 font-bold text-sm">{pre.wnusd.toFixed(6)} WNUSD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Collateral ratio</span>
                          <span className="font-mono text-yellow-300">150% (safe)</span>
                        </div>
                        <div className="border-t border-slate-700 pt-2 flex justify-between">
                          <span className="text-amber-400/80">NXT fee → Orbital Treasury</span>
                          <span className="font-mono text-amber-300">{pre.nxtFee.toFixed(6)} NXT</span>
                        </div>
                      </div>
                    )}
                    {satAmt > 0 && satAmt < 10_000 && (
                      <div className="text-xs text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />Minimum 10,000 sats
                      </div>
                    )}

                    {mintMsg && (
                      <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${mintMsg.ok ? "bg-green-500/10 border border-green-500/25 text-green-300" : "bg-red-500/10 border border-red-500/25 text-red-300"}`}>
                        {mintMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                        {mintMsg.text}
                      </div>
                    )}

                    <button
                      data-testid="button-wnusd-mint"
                      disabled={!pre || satAmt < 10_000 || mintMut.isPending}
                      onClick={() => { setMintMsg(null); mintMut.mutate(satAmt); }}
                      className="w-full py-3 rounded-xl text-sm font-semibold transition-all
                        disabled:opacity-40 disabled:cursor-not-allowed
                        bg-green-500/20 text-green-300 border border-green-500/30
                        hover:bg-green-500/30 hover:border-green-500/50 active:scale-[0.99]">
                      {mintMut.isPending ? "Minting…" : pre ? `Mint ${pre.wnusd.toFixed(4)} WNUSD` : "Enter sats amount"}
                    </button>

                    <div className="text-[10px] text-gray-600 text-center">
                      Need sats? <Link href="/lightning-wallet"><span className="text-yellow-400/70 hover:text-yellow-300 cursor-pointer">Lightning wallet →</span></Link>
                      {"  ·  "}
                      Need NXT? <Link href="/wallet"><span className="text-purple-400/70 hover:text-purple-300 cursor-pointer">NXT wallet →</span></Link>
                    </div>
                  </div>
                )}

                {/* ── POSITIONS TAB ── */}
                {tab === "positions" && (
                  <div className="space-y-3">
                    {redeemMsg && (
                      <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${redeemMsg.ok ? "bg-green-500/10 border border-green-500/25 text-green-300" : "bg-red-500/10 border border-red-500/25 text-red-300"}`}>
                        {redeemMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                        {redeemMsg.text}
                      </div>
                    )}

                    {allPos.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        <Lock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        No positions yet — mint some WNUSD to get started
                      </div>
                    )}

                    {allPos.map((pos) => {
                      const ratio = parseFloat(pos.liveColRatioPct);
                      const rc = colColor(ratio);
                      const minted = parseFloat(pos.wnusd_minted);
                      const isActive = pos.status === "active";
                      return (
                        <div key={pos.id} data-testid={`card-position-${pos.id.slice(0,8)}`}
                          className={`rounded-xl border p-4 space-y-3 ${isActive ? "border-slate-700/60 bg-slate-800/30" : "border-slate-800 bg-slate-900/30 opacity-60"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isActive ? "bg-green-500/15 text-green-400" : "bg-gray-600/20 text-gray-500"}`}>
                                {pos.status.toUpperCase()}
                              </div>
                              <span className="text-[10px] text-gray-500">{new Date(pos.opened_at).toLocaleDateString()}</span>
                            </div>
                            <span className="font-mono font-bold text-green-300">{minted.toFixed(4)} WNUSD</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-gray-500 text-[10px]">Collateral</div>
                              <div className="font-mono text-yellow-300">⚡ {Number(pos.collateral_sats).toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-[10px]">Live ratio</div>
                              <div className="font-mono font-bold" style={{ color: rc }}>{ratio.toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-[10px]">NXT fee paid</div>
                              <div className="font-mono text-amber-300">{parseFloat(pos.nxt_fee_sent).toFixed(4)}</div>
                            </div>
                          </div>

                          {/* ratio bar */}
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(ratio / 3, 100)}%`, background: rc }} />
                          </div>

                          {isActive && (
                            <button
                              data-testid={`button-redeem-${pos.id.slice(0,8)}`}
                              disabled={redeemMut.isPending}
                              onClick={() => { setRedeemMsg(null); redeemMut.mutate(pos.id); }}
                              className="w-full py-2 rounded-lg text-xs font-medium transition-all
                                bg-slate-700/40 text-gray-300 border border-slate-600/50
                                hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30">
                              <MinusCircle className="w-3 h-3 inline mr-1" />
                              {redeemMut.isPending ? "Redeeming…" : `Redeem — get back ${Number(pos.collateral_sats).toLocaleString()} sats`}
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {allPos.length > 0 && (
                      <button onClick={() => { refetchPos(); }} className="w-full text-center text-xs text-gray-600 hover:text-gray-400 pt-1">
                        <RefreshCw className="w-3 h-3 inline mr-1" />Refresh
                      </button>
                    )}
                  </div>
                )}

                {/* ── HISTORY TAB ── */}
                {tab === "history" && (
                  <div>
                    {history.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        No WNUSD transactions yet
                      </div>
                    )}
                    <div className="space-y-2">
                      {history.map((tx) => {
                        const isMint    = tx.type === "mint";
                        const isRedeem  = tx.type === "redeem";
                        const color     = isMint ? "#22c55e" : isRedeem ? "#f97316" : "#6366f1";
                        const sats      = Math.abs(tx.sats_delta);
                        const wnusd     = Math.abs(parseFloat(tx.wnusd_delta));
                        return (
                          <div key={tx.id} data-testid={`tx-wnusd-${tx.id.slice(0,8)}`}
                            className="flex items-center gap-3 py-2.5 border-b border-slate-800/60 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                            <div className="flex-1">
                              <span className="font-semibold capitalize" style={{ color }}>{tx.type}</span>
                              <span className="text-gray-500 ml-2">
                                {sats.toLocaleString()} sats → {wnusd.toFixed(4)} WNUSD
                                {parseFloat(tx.nxt_fee) > 0 && <span className="text-amber-400/70"> · fee {parseFloat(tx.nxt_fee).toFixed(4)} NXT</span>}
                              </span>
                            </div>
                            <div className="text-gray-600 shrink-0">{new Date(tx.created_at).toLocaleDateString()}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
