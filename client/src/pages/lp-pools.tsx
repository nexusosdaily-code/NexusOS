import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowLeft, Droplets, Plus, Minus, ArrowRightLeft,
  TrendingUp, RefreshCw, Info, Zap, Coins, Flame, Lock,
} from "lucide-react";

function fmt(n: number | string, dec = 4): string {
  return parseFloat(String(n || 0)).toLocaleString(undefined, { maximumFractionDigits: dec });
}

function satsFmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n/1_000).toFixed(1)}k`;
  return String(n);
}

const TOKEN_ICONS: Record<string, ReactNode> = {
  NXT:   <Coins className="w-4 h-4 text-purple-400" />,
  SATS:  <Zap className="w-4 h-4 text-yellow-400" />,
  WNUSD: <span className="text-green-400 text-sm font-bold">$</span>,
};

const NXT_BASE = 1e8; // 1 NXT = 1e8 base units (sent to API)

export default function LpPoolsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activePool, setActivePool] = useState<string | null>(null);
  const [tab, setTab] = useState<"add" | "remove" | "swap">("add");
  const [amtA, setAmtA] = useState("");
  const [amtB, setAmtB] = useState("");
  const [swapAmt, setSwapAmt] = useState("");
  const [swapDir, setSwapDir] = useState<"A" | "B">("A");
  const [removeLp, setRemoveLp] = useState("");
  // Seed panel state
  const [seedPrice, setSeedPrice] = useState("1000"); // sats per 1 NXT
  const [seedPct, setSeedPct] = useState(50);         // % of liquid sats to deploy

  const { data: pools, refetch } = useQuery<any[]>({
    queryKey: ["/api/lp/pools"],
    queryFn: () => fetch("/api/lp/pools", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    refetchInterval: 15_000,
  });

  const { data: positions } = useQuery<any[]>({
    queryKey: ["/api/lp/positions"],
    queryFn: () => fetch("/api/lp/positions", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    refetchInterval: 15_000,
  });

  const { data: wallet } = useQuery<any>({
    queryKey: ["/api/portfolio/summary"],
    queryFn: () => fetch("/api/portfolio/summary", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
  });

  const { data: quote } = useQuery<any>({
    queryKey: ["/api/lp/quote", activePool, swapDir, swapAmt],
    queryFn: () => {
      if (!activePool || !swapAmt || parseFloat(swapAmt) <= 0) return null;
      return fetch(`/api/lp/quote?poolId=${activePool}&tokenIn=${swapDir}&amountIn=${Math.floor(parseFloat(swapAmt))}`, {
        credentials: "include", headers: getAuthHeaders(),
      }).then(r => r.json());
    },
    enabled: !!activePool && !!swapAmt && parseFloat(swapAmt) > 0 && tab === "swap",
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/lp/add", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ poolId: activePool, amountA: Math.floor(parseFloat(amtA)), amountB: Math.floor(parseFloat(amtB)) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j;
    },
    onSuccess: (d) => {
      toast({ title: "Liquidity added!", description: `${d.lpTokens} LP tokens minted` });
      setAmtA(""); setAmtB("");
      qc.invalidateQueries({ queryKey: ["/api/lp/pools"] });
      qc.invalidateQueries({ queryKey: ["/api/lp/positions"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/lp/remove", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ poolId: activePool, lpTokens: Math.floor(parseFloat(removeLp)) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j;
    },
    onSuccess: (d) => {
      toast({ title: "Liquidity removed", description: `Got back ${satsFmt(d.amountA)} + ${satsFmt(d.amountB)}` });
      setRemoveLp("");
      qc.invalidateQueries({ queryKey: ["/api/lp/pools"] });
      qc.invalidateQueries({ queryKey: ["/api/lp/positions"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const swapMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/lp/swap", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ poolId: activePool, tokenIn: swapDir, amountIn: Math.floor(parseFloat(swapAmt)) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j;
    },
    onSuccess: (d) => {
      toast({ title: "Swap executed!", description: `Got ${satsFmt(d.amountOut)} out (fee: ${satsFmt(d.fee)})` });
      setSwapAmt("");
      qc.invalidateQueries({ queryKey: ["/api/lp/pools"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const seedMut = useMutation({
    mutationFn: async ({ poolId, amountA, amountB }: { poolId: string; amountA: number; amountB: number }) => {
      const r = await fetch("/api/lp/add", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ poolId, amountA, amountB }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j;
    },
    onSuccess: (d) => {
      toast({ title: "Pool seeded!", description: `${satsFmt(d.lpTokens)} LP tokens minted — you own 100% of this pool` });
      qc.invalidateQueries({ queryKey: ["/api/lp/pools"] });
      qc.invalidateQueries({ queryKey: ["/api/lp/positions"] });
      qc.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
    },
    onError: (e: any) => toast({ title: "Seed failed", description: e.message, variant: "destructive" }),
  });

  const poolsArr = Array.isArray(pools) ? pools : [];
  const posArr   = Array.isArray(positions) ? positions : [];

  const selectedPool = poolsArr.find(p => p.poolId === activePool);
  const myPos        = posArr.find(p => p.poolId === activePool);

  // Seed calculations
  const liquidSats  = Number(wallet?.satsBalance ?? 0);
  const nxtBalance  = parseFloat(wallet?.nxtBalance ?? "0");
  const price       = Math.max(1, parseFloat(seedPrice) || 1000);
  const satsToSeed  = Math.floor(liquidSats * seedPct / 100);
  const nxtToSeed   = satsToSeed / price;             // whole NXT
  const nxtBase     = Math.floor(nxtToSeed * NXT_BASE); // base units for API
  const lpPreview   = Math.floor(Math.sqrt(nxtBase * satsToSeed));
  const nxtOk       = nxtToSeed <= nxtBalance;
  const satsOk      = satsToSeed <= liquidSats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/10 to-slate-950 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <Link href="/portfolio">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Portfolio
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-slate-500 hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Droplets className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Liquidity Pools</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Provide liquidity · Earn 0.3% swap fees · Farm yield
          </p>
        </div>

        {/* Pool cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {poolsArr.map((pool: any) => {
            const hasLiquidity = pool.reserveA > 0 && pool.reserveB > 0;
            const price = hasLiquidity ? (pool.reserveB / pool.reserveA) : 0;
            const myPosition = posArr.find((p: any) => p.poolId === pool.poolId);
            const isActive = activePool === pool.poolId;

            return (
              <Card
                key={pool.poolId}
                onClick={() => setActivePool(isActive ? null : pool.poolId)}
                className={`p-4 cursor-pointer transition-all ${
                  isActive
                    ? "bg-blue-950/40 border-blue-400/40"
                    : "bg-slate-900/60 border-slate-700/40 hover:border-blue-500/30"
                }`}
                data-testid={`pool-card-${pool.poolId}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                        {TOKEN_ICONS[pool.tokenA] ?? <span className="text-[10px]">{pool.tokenA[0]}</span>}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                        {TOKEN_ICONS[pool.tokenB] ?? <span className="text-[10px]">{pool.tokenB[0]}</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{pool.name}</div>
                      <div className="text-[10px] text-slate-500">{pool.feeBps / 100}% fee</div>
                    </div>
                  </div>
                  {myPosition && myPosition.lpTokens > 0 && (
                    <Badge className="text-[9px] bg-blue-950/40 text-blue-300 border-blue-500/20">Your LP</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-800/40 rounded-lg p-2">
                    <div className="text-[10px] text-slate-500">{pool.tokenA} reserve</div>
                    <div className="text-xs font-mono text-white">{satsFmt(pool.reserveA)}</div>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-2">
                    <div className="text-[10px] text-slate-500">{pool.tokenB} reserve</div>
                    <div className="text-xs font-mono text-white">{satsFmt(pool.reserveB)}</div>
                  </div>
                </div>
                {hasLiquidity && (
                  <div className="mt-2 text-center text-[10px] text-slate-500 font-mono">
                    Rate: 1 {pool.tokenA} = {fmt(price, 2)} {pool.tokenB}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* ── Seed Panel — shown when an empty pool is selected ── */}
        {activePool && selectedPool && selectedPool.reserveA === 0 && selectedPool.tokenB === "SATS" && (
          <Card className="bg-gradient-to-br from-blue-950/40 to-purple-950/30 border-blue-400/30 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-bold text-white">Seed This Pool</span>
              <span className="text-[10px] text-slate-500 ml-auto">You'd be the founding LP — 100% of fees</span>
            </div>

            {/* Wallet snapshot */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-slate-800/50 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Liquid Sats</div>
                <div className="text-sm font-bold text-yellow-400">{satsFmt(liquidSats)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">NXT Balance</div>
                <div className="text-sm font-bold text-purple-400">{satsFmt(nxtBalance)}</div>
              </div>
            </div>

            {/* Price setter */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider">Opening price — sats per 1 NXT</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={seedPrice}
                  onChange={e => setSeedPrice(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white font-mono flex-1"
                  data-testid="input-seed-price"
                />
                {["500","1000","2000"].map(p => (
                  <button key={p} onClick={() => setSeedPrice(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${seedPrice === p ? "border-blue-400/50 bg-blue-500/20 text-blue-300" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* % of liquid sats */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider">Deploy — % of liquid sats</label>
              <div className="flex gap-2 mt-1">
                {[10, 25, 50, 100].map(p => (
                  <button key={p} onClick={() => setSeedPct(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${seedPct === p ? "border-blue-400/50 bg-blue-500/20 text-blue-300" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}
                    data-testid={`seed-pct-${p}`}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-800/60 rounded-xl p-3 mb-4 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">You deposit</span>
                <span className="text-white font-mono">{satsFmt(Math.floor(nxtToSeed))} NXT + {satsFmt(satsToSeed)} sats</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">LP tokens minted</span>
                <span className="text-blue-300 font-mono">{satsFmt(lpPreview)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Your pool share</span>
                <span className="text-green-400 font-bold">100%</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Fee rate</span>
                <span className="text-slate-400">{selectedPool.feeBps / 100}% per swap — goes to you</span>
              </div>
              {!nxtOk && (
                <div className="text-[10px] text-red-400 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Not enough NXT (need {satsFmt(Math.floor(nxtToSeed))}, have {satsFmt(nxtBalance)})
                </div>
              )}
              {!satsOk && (
                <div className="text-[10px] text-red-400 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Not enough liquid sats
                </div>
              )}
              {liquidSats === 0 && (
                <div className="text-[10px] text-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Your sats are staked until July — unstake first to seed
                </div>
              )}
            </div>

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold"
              onClick={() => seedMut.mutate({ poolId: activePool, amountA: nxtBase, amountB: satsToSeed })}
              disabled={seedMut.isPending || !nxtOk || !satsOk || satsToSeed <= 0 || nxtBase <= 0}
              data-testid="button-seed-pool"
            >
              {seedMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Flame className="w-4 h-4 mr-2" />}
              Seed Pool — {satsFmt(Math.floor(nxtToSeed))} NXT + {satsFmt(satsToSeed)} sats
            </Button>
          </Card>
        )}

        {/* My positions summary */}
        {posArr.filter((p: any) => p.lpTokens > 0).length > 0 && (
          <Card className="bg-slate-900/60 border-blue-500/20 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">Your Positions</span>
            </div>
            <div className="space-y-2">
              {posArr.filter((p: any) => p.lpTokens > 0).map((pos: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2.5" data-testid={`pos-row-${i}`}>
                  <div>
                    <div className="text-[11px] text-white font-semibold">{pos.pool?.name ?? pos.poolId}</div>
                    <div className="text-[10px] text-slate-500">{pos.sharePercent}% share · {satsFmt(pos.lpTokens)} LP</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-blue-300">{satsFmt(pos.valueA ?? 0)} {pos.pool?.tokenA}</div>
                    <div className="text-[10px] font-mono text-blue-300">{satsFmt(pos.valueB ?? 0)} {pos.pool?.tokenB}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action panel — shown when a pool is selected */}
        {activePool && selectedPool && (
          <Card className="bg-slate-900/70 border-blue-400/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5">
                {TOKEN_ICONS[selectedPool.tokenA]}
                <span className="text-sm font-bold text-white">{selectedPool.name}</span>
              </div>
              {myPos && myPos.lpTokens > 0 && (
                <span className="text-[10px] text-slate-500 ml-auto">
                  Your LP: {satsFmt(myPos.lpTokens)} tokens ({myPos.sharePercent}%)
                </span>
              )}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-4">
              {(["add","remove","swap"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                    tab === t ? "bg-blue-500/20 text-blue-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                  data-testid={`tab-${t}`}
                >
                  {t === "add" ? <><Plus className="w-3 h-3 inline mr-1" />Add</> :
                   t === "remove" ? <><Minus className="w-3 h-3 inline mr-1" />Remove</> :
                   <><ArrowRightLeft className="w-3 h-3 inline mr-1" />Swap</>}
                </button>
              ))}
            </div>

            {tab === "add" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">{selectedPool.tokenA} amount</label>
                  <Input value={amtA} onChange={e => setAmtA(e.target.value)} placeholder={`${selectedPool.tokenA} amount`}
                    className="bg-slate-800 border-slate-700 text-white font-mono mt-1" data-testid="input-amt-a" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">{selectedPool.tokenB} amount</label>
                  <Input value={amtB} onChange={e => setAmtB(e.target.value)} placeholder={`${selectedPool.tokenB} amount`}
                    className="bg-slate-800 border-slate-700 text-white font-mono mt-1" data-testid="input-amt-b" />
                </div>
                <div className="flex items-center gap-2 bg-blue-950/20 border border-blue-500/20 rounded-xl p-2.5">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="text-[11px] text-blue-300/70">
                    LP tokens represent your share of pool fees (0.3% on every swap).
                    Amounts are deducted from your NexusOS wallet balance.
                  </div>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                  onClick={() => addMut.mutate()}
                  disabled={addMut.isPending || !amtA || !amtB}
                  data-testid="button-add-liquidity"
                >
                  {addMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Liquidity
                </Button>
              </div>
            )}

            {tab === "remove" && (
              <div className="space-y-3">
                {myPos && myPos.lpTokens > 0 ? (
                  <>
                    <div className="bg-slate-800/40 rounded-xl p-3 text-center">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Your LP Balance</div>
                      <div className="text-lg font-bold text-white">{satsFmt(myPos.lpTokens)} LP</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        ≈ {satsFmt(myPos.valueA)} {selectedPool.tokenA} + {satsFmt(myPos.valueB)} {selectedPool.tokenB}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input value={removeLp} onChange={e => setRemoveLp(e.target.value)} placeholder="LP tokens to remove"
                        className="bg-slate-800 border-slate-700 text-white font-mono flex-1" data-testid="input-remove-lp" />
                      <Button variant="outline" size="sm" className="border-slate-600 text-slate-400"
                        onClick={() => setRemoveLp(String(myPos.lpTokens))}>Max</Button>
                    </div>
                    <Button
                      className="w-full bg-red-600/80 hover:bg-red-600 text-white"
                      onClick={() => removeMut.mutate()}
                      disabled={removeMut.isPending || !removeLp}
                      data-testid="button-remove-liquidity"
                    >
                      {removeMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Minus className="w-4 h-4 mr-2" />}
                      Remove Liquidity
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-slate-600 text-sm">You have no LP position in this pool.</div>
                )}
              </div>
            )}

            {tab === "swap" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSwapDir("A")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      swapDir === "A" ? "border-blue-400/50 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-500"
                    }`}
                    data-testid="swap-dir-a"
                  >
                    {selectedPool.tokenA} → {selectedPool.tokenB}
                  </button>
                  <button
                    onClick={() => setSwapDir("B")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      swapDir === "B" ? "border-blue-400/50 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-500"
                    }`}
                    data-testid="swap-dir-b"
                  >
                    {selectedPool.tokenB} → {selectedPool.tokenA}
                  </button>
                </div>
                <Input
                  value={swapAmt}
                  onChange={e => setSwapAmt(e.target.value)}
                  placeholder={`${swapDir === "A" ? selectedPool.tokenA : selectedPool.tokenB} amount in`}
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                  data-testid="input-swap-amount"
                />
                {quote && !quote.error && (
                  <div className="bg-slate-800/50 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">You receive</span>
                      <span className="text-green-400 font-bold font-mono">{satsFmt(quote.amountOut)} {swapDir === "A" ? selectedPool.tokenB : selectedPool.tokenA}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Fee ({selectedPool.feeBps / 100}%)</span>
                      <span className="text-slate-400 font-mono">{satsFmt(quote.fee)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Price impact</span>
                      <span className={`font-mono ${quote.priceImpactPct > 5 ? "text-red-400" : quote.priceImpactPct > 1 ? "text-amber-400" : "text-green-400"}`}>
                        {quote.priceImpactPct}%
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                  onClick={() => swapMut.mutate()}
                  disabled={swapMut.isPending || !swapAmt || !quote || quote.amountOut === 0}
                  data-testid="button-swap"
                >
                  {swapMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                  Swap
                </Button>
              </div>
            )}
          </Card>
        )}

        <div className="flex justify-center gap-6 mt-6 text-[11px] text-slate-600">
          <Link href="/portfolio" className="hover:text-slate-400">Portfolio</Link>
          <Link href="/receive" className="hover:text-slate-400">Receive</Link>
          <Link href="/lightning-wallet" className="hover:text-slate-400">Wallet</Link>
        </div>
      </div>
    </div>
  );
}
