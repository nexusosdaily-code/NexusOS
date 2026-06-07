import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Zap, Droplets, Lock, Unlock, RefreshCw,
  TrendingUp, Info, ArrowRightLeft, Coins,
} from "lucide-react";

const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function satsFmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(2) + "k";
  return n.toLocaleString();
}

function fmt(n: number, dec = 2) {
  return n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function WSatsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [satInput, setSatInput] = useState("");
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const { data: pos, isLoading } = useQuery({
    queryKey: ["/api/wsats/positions"],
    queryFn: () => fetch("/api/wsats/positions", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["/api/portfolio/summary"],
    queryFn: () => fetch("/api/portfolio/summary", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
  });

  const { data: pool } = useQuery({
    queryKey: ["/api/lp/pools"],
    queryFn: () => fetch("/api/lp/pools", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
  });

  const wsatsPool = Array.isArray(pool) ? pool.find((p: any) => p.poolId === "wsats-nxwv") : null;

  const satsBalance  = Number(summary?.satsBalance ?? 0);
  const nxtBalance   = parseFloat(summary?.nxtBalance ?? "0");
  const totalMinted  = Number(pos?.totalMinted ?? 0);
  const positions    = Array.isArray(pos?.positions) ? pos.positions : [];
  const activePos    = positions.filter((p: any) => p.status === "active");

  const satAmt       = parseInt(satInput) || 0;
  const nxtFeeEst    = parseFloat(((satAmt / 1000) * 0.001).toFixed(8));
  const canMint      = satAmt >= 1_000 && satAmt <= satsBalance && nxtBalance >= nxtFeeEst;

  const btcUsd       = Number(summary?.btcUsd ?? 65_000);
  const wsatsUsd     = totalMinted / 100_000_000 * btcUsd;

  const mintMut = useMutation({
    mutationFn: (satAmount: number) =>
      fetch("/api/wsats/mint", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ satAmount }),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: (d) => {
      toast({ title: "wSATS minted!", description: `${satsFmt(d.wsatsMinted)} wSATS wrapped from ${satsFmt(d.satAmount)} sats` });
      setSatInput("");
      qc.invalidateQueries({ queryKey: ["/api/wsats/positions"] });
      qc.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
    },
    onError: (e: any) => toast({ title: "Mint failed", description: e.message, variant: "destructive" }),
  });

  const redeemMut = useMutation({
    mutationFn: (positionId: string) =>
      fetch("/api/wsats/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ positionId }),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: (d) => {
      toast({ title: "wSATS redeemed!", description: `${satsFmt(d.satsReturned)} sats returned to your Lightning wallet` });
      setRedeemingId(null);
      qc.invalidateQueries({ queryKey: ["/api/wsats/positions"] });
      qc.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
    },
    onError: (e: any) => { toast({ title: "Redeem failed", description: e.message, variant: "destructive" }); setRedeemingId(null); },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12">
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/portfolio">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
              wSATS — Wrapped Sats
            </h1>
            <p className="text-[11px] text-slate-500">1:1 sats-backed · NexusOS pipeline</p>
          </div>
        </div>

        {/* Balance overview */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">wSATS Held</div>
            <div className="text-base font-bold text-cyan-400">{satsFmt(totalMinted)}</div>
            <div className="text-[10px] text-slate-600">${fmt(wsatsUsd)}</div>
          </div>
          <div className="bg-slate-900/60 border border-yellow-500/20 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Sats Free</div>
            <div className="text-base font-bold text-yellow-400">{satsFmt(satsBalance)}</div>
            <div className="text-[10px] text-slate-600">lightning</div>
          </div>
          <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Positions</div>
            <div className="text-base font-bold text-purple-400">{activePos.length}</div>
            <div className="text-[10px] text-slate-600">active</div>
          </div>
        </div>

        {/* How it works */}
        <Card className="bg-slate-900/40 border-slate-700/30 p-3 mb-5">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
            <div className="text-[11px] text-slate-500 leading-relaxed space-y-1">
              <p>Wrap sats 1:1 into <span className="text-cyan-400 font-semibold">wSATS</span> — fully redeemable anytime, no liquidation risk.</p>
              <p>Use wSATS as one side of the <span className="text-purple-400 font-semibold">wSATS/NXWV</span> liquidity pair to earn trading fees + NXT yield.</p>
              <p>Fee: <span className="text-white">0.1% of NXT equivalent</span> on mint only. Redeem is always free.</p>
            </div>
          </div>
        </Card>

        {/* Mint form */}
        <Card className="bg-slate-900/60 border-cyan-500/20 p-4 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Wrap Sats</span>
          </div>

          <div className="relative mb-3">
            <input
              type="number"
              placeholder="Amount in sats (min 1,000)"
              value={satInput}
              onChange={e => setSatInput(e.target.value)}
              data-testid="input-wsats-amount"
              className="w-full bg-slate-800/60 border border-slate-600/40 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 pr-20"
            />
            <button
              onClick={() => setSatInput(String(satsBalance))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-cyan-500 hover:text-cyan-300 font-semibold uppercase tracking-wider"
              data-testid="btn-wsats-max"
            >
              MAX
            </button>
          </div>

          {satAmt > 0 && (
            <div className="bg-slate-800/40 rounded-lg px-3 py-2 mb-3 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">You wrap</span>
                <span className="text-white font-mono">{satsFmt(satAmt)} sats</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">You receive</span>
                <span className="text-cyan-400 font-mono font-bold">{satsFmt(satAmt)} wSATS</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">NXT fee (0.1%)</span>
                <span className="text-orange-400 font-mono">{nxtFeeEst.toFixed(6)} NXT</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Rate</span>
                <span className="text-slate-400">1 wSATS = 1 sat</span>
              </div>
            </div>
          )}

          <Button
            onClick={() => mintMut.mutate(satAmt)}
            disabled={!canMint || mintMut.isPending}
            data-testid="btn-wsats-mint"
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 rounded-xl"
          >
            {mintMut.isPending ? (
              <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Wrapping…</>
            ) : (
              <><Lock className="w-4 h-4 mr-2" />Wrap {satAmt >= 1000 ? `${satsFmt(satAmt)} sats → wSATS` : "Sats"}</>
            )}
          </Button>
          {satAmt > 0 && satAmt < 1_000 && (
            <p className="text-[10px] text-red-400 mt-1.5 text-center">Minimum 1,000 sats</p>
          )}
          {satAmt > satsBalance && satsBalance > 0 && (
            <p className="text-[10px] text-red-400 mt-1.5 text-center">Exceeds balance ({satsFmt(satsBalance)} sats)</p>
          )}
        </Card>

        {/* LP Pool entry */}
        <Card className="bg-slate-900/60 border-purple-500/20 p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-400 uppercase tracking-widest">wSATS / NXWV Pool</span>
            </div>
            <Badge className="text-[9px] bg-purple-950/40 text-purple-300 border border-purple-500/20 px-2">0.20% fee</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-slate-800/30 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-500">Reserve wSATS</div>
              <div className="text-[12px] font-bold text-cyan-400 font-mono">
                {wsatsPool ? satsFmt(wsatsPool.reserveA) : "—"}
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-500">Reserve NXWV</div>
              <div className="text-[12px] font-bold text-purple-400 font-mono">
                {wsatsPool ? satsFmt(wsatsPool.reserveB) : "—"}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mb-3 text-center">
            {wsatsPool && wsatsPool.totalLpTokens > 0
              ? `${satsFmt(wsatsPool.totalLpTokens)} LP tokens in circulation`
              : "Pool is empty — be the first to add liquidity and earn all fees"}
          </div>

          <Link href="/lp-pools">
            <Button
              variant="outline"
              data-testid="btn-wsats-lp"
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-950/40 hover:text-purple-200 rounded-xl"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {wsatsPool && wsatsPool.totalLpTokens > 0 ? "Add Liquidity" : "Bootstrap Pool"}
            </Button>
          </Link>
        </Card>

        {/* Active positions */}
        <Card className="bg-slate-900/60 border-slate-700/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Positions</span>
            </div>
            {isLoading && <RefreshCw className="w-3.5 h-3.5 text-slate-600 animate-spin" />}
          </div>

          {positions.length === 0 ? (
            <div className="text-[12px] text-slate-600 text-center py-4">
              No positions yet — wrap some sats above
            </div>
          ) : (
            <div className="space-y-2">
              {positions.map((p: any) => (
                <div
                  key={p.id}
                  data-testid={`wsats-position-${p.id}`}
                  className={`rounded-xl px-3 py-2.5 ${
                    p.status === "active"
                      ? "bg-slate-800/40 border border-cyan-500/15"
                      : "bg-slate-900/30 border border-slate-700/20 opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12px] font-bold text-white font-mono">
                        {satsFmt(p.wsatsMinted)} wSATS
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {satsFmt(p.satsLocked)} sats locked · fee {parseFloat(p.nxtFeeSent).toFixed(4)} NXT
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {new Date(p.openedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {p.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`btn-redeem-${p.id}`}
                          disabled={redeemMut.isPending && redeemingId === p.id}
                          onClick={() => { setRedeemingId(p.id); redeemMut.mutate(p.id); }}
                          className="text-[10px] h-7 border-slate-600/40 text-slate-400 hover:text-white hover:border-slate-500 rounded-lg px-2.5"
                        >
                          {redeemMut.isPending && redeemingId === p.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <><Unlock className="w-3 h-3 mr-1" />Redeem</>
                          )}
                        </Button>
                      ) : (
                        <Badge className="text-[9px] bg-slate-800 text-slate-500 border-slate-700">Redeemed</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
