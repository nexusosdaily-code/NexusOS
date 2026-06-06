import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowLeft, Zap, Bitcoin, Coins, DollarSign, Lock, Droplets,
  TrendingUp, RefreshCw, ExternalLink, LayoutDashboard, ArrowDownToLine,
  CalendarClock, Flame,
} from "lucide-react";

function fmt(n: number | string, dec = 2): string {
  return parseFloat(String(n)).toLocaleString(undefined, { maximumFractionDigits: dec, minimumFractionDigits: dec });
}

function satsFmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function PortfolioPage() {
  const { data: summary, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/portfolio/summary"],
    queryFn: () => fetch("/api/portfolio/summary", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: lpPos } = useQuery<any[]>({
    queryKey: ["/api/lp/positions"],
    queryFn: () => fetch("/api/lp/positions", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
  });

  // Sats staking — the real staking positions (sats_stakes table)
  const { data: lightningStakes } = useQuery<any>({
    queryKey: ["/api/lightning/stakes"],
    queryFn: () => fetch("/api/lightning/stakes", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
  });

  const { data: wnusd } = useQuery<any[]>({
    queryKey: ["/api/wnusd/positions"],
    queryFn: () => fetch("/api/wnusd/positions", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
  });

  const sats        = Number(summary?.satsBalance ?? 0);
  const satsStaked  = Number(summary?.satsStaked ?? 0);
  const nxtYield    = parseFloat(summary?.nxtYieldPending ?? "0");
  const stakeCount  = Number(summary?.stakeCount ?? 0);
  const nxt         = parseFloat(summary?.nxtBalance ?? "0");
  const wnusdBal    = parseFloat(summary?.wnusdBalance ?? "0");
  const btcUsd      = Number(summary?.btcUsd ?? 65_000);
  const satsPerNxt  = 1_000;

  const satsUsd     = sats / 100_000_000 * btcUsd;
  const stakedUsd   = satsStaked / 100_000_000 * btcUsd;
  const nxtUsd      = nxt * satsPerNxt / 100_000_000 * btcUsd;
  const totalUsd    = satsUsd + stakedUsd + nxtUsd + wnusdBal;

  const stakesArr   = Array.isArray(lightningStakes?.stakes) ? lightningStakes.stakes : [];
  const wnusdArr    = Array.isArray(wnusd)  ? wnusd  : [];
  const lpPosArr    = Array.isArray(lpPos)  ? lpPos  : [];

  const activeStakes    = stakesArr.filter((s: any) => s.status === "active");
  const stakedSatsTotal = activeStakes.reduce((a: number, s: any) => a + Number(s.amountSats ?? 0), 0);
  const pendingYield    = activeStakes.reduce((a: number, s: any) => a + parseFloat(s.nxtYield ?? "0"), 0);
  const activeWnusd   = wnusdArr.filter((p: any) => p.status === "active");
  const totalWnusdMinted = activeWnusd.reduce((a: number, p: any) => a + parseFloat(p.wnusdMinted ?? "0"), 0);
  const lpCount       = lpPosArr.filter((p: any) => p.lpTokens > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Home
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-slate-500 hover:text-white">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Hero — total value */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <LayoutDashboard className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          </div>
          {isLoading ? (
            <div className="text-slate-500 text-sm">Loading…</div>
          ) : (
            <>
              <div className="text-4xl font-bold text-white mb-1">
                ${fmt(totalUsd, 2)}
              </div>
              <div className="text-slate-500 text-sm font-mono">
                ≈ {satsFmt(sats + nxt * satsPerNxt)} sats total
              </div>
            </>
          )}
        </div>

        {/* Asset breakdown */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { icon: Zap,        label: "Liquid Sats",  value: satsFmt(sats),        sub: `$${fmt(satsUsd)}`,    color: "yellow" },
            { icon: Lock,       label: "Staked Sats",  value: satsFmt(satsStaked),  sub: `$${fmt(stakedUsd)}`,  color: "orange" },
          ].map(item => (
            <Card key={item.label} className="bg-slate-900/60 border-slate-700/40 p-3 text-center">
              <item.icon className={`w-5 h-5 mx-auto mb-1.5 ${
                item.color === "yellow" ? "text-yellow-400" : "text-orange-400"
              }`} />
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</div>
              <div className="font-bold text-sm text-white mt-0.5">{item.value}</div>
              <div className="text-[10px] text-slate-500 font-mono">{item.sub}</div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: Coins,      label: "NXT",   value: fmt(nxt, 4),      sub: `$${fmt(nxtUsd)}`,  color: "purple" },
            { icon: DollarSign, label: "WNUSD", value: fmt(wnusdBal, 2), sub: "≈ USD",            color: "green"  },
          ].map(item => (
            <Card key={item.label} className="bg-slate-900/60 border-slate-700/40 p-3 text-center">
              <item.icon className={`w-5 h-5 mx-auto mb-1.5 ${
                item.color === "purple" ? "text-purple-400" : "text-green-400"
              }`} />
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</div>
              <div className="font-bold text-sm text-white mt-0.5">{item.value}</div>
              <div className="text-[10px] text-slate-500 font-mono">{item.sub}</div>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Receive",   href: "/receive",          icon: ArrowDownToLine, color: "text-cyan-400"   },
            { label: "Stake",     href: "/lightning-wallet",  icon: Lock,           color: "text-purple-400" },
            { label: "Liquidity", href: "/lp-pools",          icon: Droplets,       color: "text-blue-400"   },
          ].map(a => (
            <Link key={a.label} href={a.href}>
              <Card className="bg-slate-900/60 border-slate-700/40 p-3 text-center cursor-pointer hover:border-slate-500/60 transition-colors">
                <a.icon className={`w-5 h-5 mx-auto mb-1 ${a.color}`} />
                <div className="text-[11px] text-slate-400 font-medium">{a.label}</div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Staking positions */}
        <Card className="bg-slate-900/60 border-orange-500/20 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-orange-400 uppercase tracking-widest">Staking</span>
            </div>
            <Link href="/lightning-wallet">
              <Badge className="text-[9px] bg-orange-950/40 text-orange-300 border border-orange-500/20 px-2 cursor-pointer hover:bg-orange-900/40">
                {activeStakes.length} active
              </Badge>
            </Link>
          </div>

          {activeStakes.length === 0 ? (
            <div className="text-slate-600 text-[12px] text-center py-3">No active stakes — <Link href="/lightning-wallet" className="text-orange-400 hover:underline">stake now</Link></div>
          ) : (
            <div className="space-y-2">
              {/* Summary row */}
              <div className="grid grid-cols-2 gap-3 mb-1">
                <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Staked</div>
                  <div className="text-sm font-bold text-white mt-0.5">{satsFmt(stakedSatsTotal)} sats</div>
                </div>
                <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">NXT Yield</div>
                  <div className="text-sm font-bold text-green-400 mt-0.5">+{satsFmt(pendingYield)} NXT</div>
                </div>
              </div>
              {/* Individual stakes */}
              {activeStakes.slice(0, 4).map((s: any, i: number) => {
                const matures = s.maturesAt ? new Date(s.maturesAt) : null;
                const daysLeft = matures ? Math.max(0, Math.ceil((matures.getTime() - Date.now()) / 86_400_000)) : null;
                return (
                  <div key={s.id ?? i} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2" data-testid={`stake-row-${i}`}>
                    <div>
                      <div className="text-[11px] text-white font-semibold">{satsFmt(Number(s.amountSats))} sats</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <CalendarClock className="w-2.5 h-2.5" />
                        {daysLeft !== null ? `${daysLeft}d left` : `${s.lockDays}d lock`} · {s.yieldRatePercent}% APY
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-green-400 font-mono flex items-center gap-0.5 justify-end">
                        <Flame className="w-2.5 h-2.5" />+{satsFmt(parseFloat(s.nxtYield ?? "0"))}
                      </div>
                      <div className="text-[10px] text-slate-600">NXT yield</div>
                    </div>
                  </div>
                );
              })}
              {activeStakes.length > 4 && (
                <div className="text-[10px] text-slate-600 text-center">+{activeStakes.length - 4} more positions —{" "}
                  <Link href="/lightning-wallet" className="text-orange-400 hover:underline">view all</Link>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* WNUSD positions */}
        {totalWnusdMinted > 0 && (
          <Card className="bg-slate-900/60 border-green-500/20 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-sm font-bold text-green-400 uppercase tracking-widest">WNUSD</span>
              </div>
              <Badge className="text-[9px] bg-green-950/40 text-green-300 border border-green-500/20 px-2">
                {activeWnusd.length} position{activeWnusd.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Minted</div>
                <div className="text-sm font-bold text-white mt-0.5">{fmt(totalWnusdMinted, 2)} WNUSD</div>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Collateral</div>
                <div className="text-sm font-bold text-green-400 mt-0.5">
                  {satsFmt(activeWnusd.reduce((a: number, p: any) => a + Number(p.collateralSats), 0))} sats
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* LP positions */}
        <Card className="bg-slate-900/60 border-blue-500/20 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">Liquidity Pools</span>
            </div>
            <Link href="/lp-pools">
              <Badge className="text-[9px] bg-blue-950/40 text-blue-300 border border-blue-500/20 px-2 cursor-pointer hover:bg-blue-900/40">
                {lpCount} active
              </Badge>
            </Link>
          </div>
          {lpCount === 0 ? (
            <div className="text-slate-600 text-[12px] text-center py-3">
              No LP positions — <Link href="/lp-pools" className="text-blue-400 hover:underline">add liquidity</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {lpPosArr.filter((p: any) => p.lpTokens > 0).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2" data-testid={`lp-row-${i}`}>
                  <div>
                    <div className="text-[11px] text-white font-semibold">{p.pool?.name ?? p.poolId}</div>
                    <div className="text-[10px] text-slate-500">{p.sharePercent}% pool share</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-blue-400 font-mono">{satsFmt(p.valueA ?? 0)} + {satsFmt(p.valueB ?? 0)}</div>
                    <div className="text-[10px] text-slate-600">{p.pool?.tokenA} / {p.pool?.tokenB}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Bitcoin / Ordinals / Runes */}
        <Card className="bg-slate-900/60 border-orange-500/20 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bitcoin className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-orange-400 uppercase tracking-widest">Bitcoin L1</span>
            </div>
            <a href="https://mempool.space" target="_blank" rel="noopener noreferrer">
              <Badge className="text-[9px] bg-orange-950/40 text-orange-300 border border-orange-500/20 px-2 cursor-pointer">
                <ExternalLink className="w-2.5 h-2.5 mr-1" /> Mempool
              </Badge>
            </a>
          </div>
          <div className="space-y-2">
            {[
              { label: "Ordinals",          href: "/btc-assets-sentinel", icon: "🪬", desc: "Inscriptions tracked by Asset Sentinel" },
              { label: "NEXUS•WAVELENGTH",  href: "/rune-staking",        icon: "🌈", desc: "Rune balance + staking rewards" },
              { label: "BRC-20",            href: "/btc-assets-sentinel", icon: "🔶", desc: "Token balances via Asset Sentinel" },
            ].map(row => (
              <Link key={row.label} href={row.href}>
                <div className="flex items-center gap-3 bg-slate-800/30 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-700/30 transition-colors">
                  <span className="text-lg">{row.icon}</span>
                  <div className="flex-1">
                    <div className="text-[11px] text-white font-semibold">{row.label}</div>
                    <div className="text-[10px] text-slate-500">{row.desc}</div>
                  </div>
                  <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
                </div>
              </Link>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
