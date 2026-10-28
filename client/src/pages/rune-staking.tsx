import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChannelConnect } from "@/components/channel-connect";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, TrendingUp, Gem, Zap, Clock, CheckCircle2,
  Coins, X, ArrowRight, AlertCircle, Hash, Activity,
} from "lucide-react";

function fmtTime(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts), now = Date.now();
  const diff = now - d.getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), day = Math.floor(h / 24);
  if (day > 0) return `${day}d ago`;
  if (h > 0)   return `${h}h ago`;
  if (m > 0)   return `${m}m ago`;
  return "just now";
}

function epochProgress(stake: any): { hours: number; pct: number; nextIn: string } {
  const since = stake.lastClaimAt ?? stake.stakedAt;
  const diff = Date.now() - new Date(since).getTime();
  const hours = diff / 3_600_000;
  const pct = Math.min(100, (hours / 24) * 100);
  const remaining = Math.max(0, 24 - hours);
  const h = Math.floor(remaining), m = Math.floor((remaining - h) * 60);
  const nextIn = hours >= 24 ? "Ready!" : `${h}h ${m}m`;
  return { hours, pct, nextIn };
}

export default function RuneStakingPage() {
  const { user } = useAuth() as any;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showStake, setShowStake] = useState(false);
  const [form, setForm] = useState({ runeUtxo: "", runeAmount: "1000" });

  const { data: runeData }    = useQuery<any>({ queryKey: ["/api/rune/info"], refetchInterval: 30_000 });
  const { data: stakesData }  = useQuery<any>({ queryKey: ["/api/rune/my-stakes"], enabled: !!user, refetchInterval: 15_000 });
  const { data: walletData }  = useQuery<any>({ queryKey: ["/api/wallet"] });

  const createStake = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/rune/stake", { runeUtxo: form.runeUtxo, runeAmount: parseInt(form.runeAmount) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Staked!", description: `${form.runeAmount} NEXUS•WAVELENGTH now earning 150 NXT/epoch` });
      setShowStake(false);
      setForm({ runeUtxo: "", runeAmount: "1000" });
      qc.invalidateQueries({ queryKey: ["/api/rune/my-stakes"] });
      qc.invalidateQueries({ queryKey: ["/api/rune/info"] });
    },
    onError: (e: any) => toast({ title: "Stake failed", description: e.message, variant: "destructive" }),
  });

  const claimStake = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/rune/claim/${id}`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "💰 Claimed!", description: `+${data.rewardNxt.toFixed(2)} NXT for ${data.epochsClaimed} epoch(s)` });
      qc.invalidateQueries({ queryKey: ["/api/rune/my-stakes"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (e: any) => toast({ title: "Claim failed", description: e.message, variant: "destructive" }),
  });

  const unstake = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/rune/unstake/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Unstaked", description: "Your Rune UTXO has been released." });
      qc.invalidateQueries({ queryKey: ["/api/rune/my-stakes"] });
      qc.invalidateQueries({ queryKey: ["/api/rune/info"] });
    },
    onError: (e: any) => toast({ title: "Unstake failed", description: e.message, variant: "destructive" }),
  });

  const stakes       = stakesData?.stakes ?? [];
  const activeStakes = stakes.filter((s: any) => s.status === "active");
  const pastStakes   = stakes.filter((s: any) => s.status !== "active");
  const totalEarned  = stakes.reduce((sum: number, s: any) => sum + parseFloat(s.nxtEarned ?? "0"), 0);
  const balRaw       = walletData?.wallet ? parseFloat(walletData.wallet.balance) / 1e8 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/rune-etching">
            <button className="text-slate-400 hover:text-white transition-colors" aria-label="Back to Rune Etching">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Rune Staking</h1>
              <p className="text-xs text-slate-400">Stake NEXUS•WAVELENGTH → earn 150 NXT / epoch</p>
            </div>
          </div>
          <div className="flex-1" />
          {user && (
            <Button onClick={() => setShowStake(true)} className="bg-cyan-600 hover:bg-cyan-700 gap-1.5" data-testid="button-new-stake">
              <TrendingUp className="w-4 h-4" />Stake Runes
            </Button>
          )}
        </div>

        <ChannelConnect label="Top up ⚡" />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-slate-900/60 border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold font-mono text-purple-300">{runeData?.activeStakes ?? 0}</div>
            <div className="text-[10px] text-slate-500">Active Stakes</div>
          </Card>
          <Card className="bg-slate-900/60 border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gem className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300">{(runeData?.totalStaked ?? 0).toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Total Staked (Ψ)</div>
          </Card>
          <Card className="bg-slate-900/60 border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-300">{totalEarned.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">NXT Earned (you)</div>
          </Card>
        </div>

        {/* How it works */}
        <Card className="bg-slate-900/40 border-slate-700/30 p-4 mb-5">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">How Rune Staking Works</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: "1", text: "Mint 1,000 NEXUS•WAVELENGTH for 100 NXT", icon: <Coins className="w-4 h-4 text-purple-400" /> },
              { step: "2", text: "Stake by providing your Rune UTXO", icon: <Hash className="w-4 h-4 text-cyan-400" /> },
              { step: "3", text: "Claim 150 NXT per 1,000 Ψ every 24 hours", icon: <Zap className="w-4 h-4 text-amber-400" /> },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="flex justify-center mb-2">{s.icon}</div>
                <div className="text-[10px] text-slate-400">{s.text}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Login gate */}
        {!user && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-8 text-center mb-5">
            <TrendingUp className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
            <div className="text-slate-400 text-sm mb-4">Sign in to stake your NEXUS•WAVELENGTH Runes</div>
            <Link href="/auth">
              <Button className="bg-cyan-600 hover:bg-cyan-700 gap-2">
                <ArrowRight className="w-4 h-4" />Sign In to Stake
              </Button>
            </Link>
          </Card>
        )}

        {/* Active stakes */}
        {activeStakes.length > 0 && (
          <div className="mb-5">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Active Stakes</div>
            <div className="space-y-3">
              {activeStakes.map((s: any) => {
                const prog = epochProgress(s);
                const ready = prog.hours >= 24;
                const pendingNxt = prog.hours >= 24
                  ? Math.floor(prog.hours / 24) * 150 * (s.runeAmount / 1000)
                  : 0;
                return (
                  <Card key={s.id} className="bg-slate-900/60 border-slate-700/50 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Gem className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-white font-mono text-sm">{s.runeAmount.toLocaleString()} Ψ</span>
                          <Badge className="bg-green-500/15 text-green-300 border-green-500/20 text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />staking
                          </Badge>
                        </div>
                        <div className="text-slate-600 text-[10px] font-mono truncate max-w-xs">{s.runeUtxo}</div>
                      </div>
                      <button onClick={() => unstake.mutate(s.id)} className="text-slate-700 hover:text-red-400 transition-colors" title="Unstake">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Epoch progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Epoch {s.epoch + 1} progress</span>
                        <span className={ready ? "text-green-400 font-semibold" : ""}>{prog.nextIn}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${ready ? "bg-green-500" : "bg-gradient-to-r from-purple-600 to-cyan-500"}`}
                          style={{ width: `${prog.pct}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        Total earned: <span className="text-amber-300 font-mono">{parseFloat(s.nxtEarned).toFixed(2)} NXT</span>
                        {pendingNxt > 0 && <span className="text-green-300 font-mono ml-2">(+{pendingNxt.toFixed(2)} pending)</span>}
                      </div>
                      <Button size="sm"
                        onClick={() => claimStake.mutate(s.id)}
                        disabled={!ready || claimStake.isPending}
                        className={`text-xs gap-1 ${ready ? "bg-amber-600 hover:bg-amber-700" : "bg-slate-700 text-slate-500"}`}
                        data-testid={`button-claim-${s.id}`}
                      >
                        <Zap className="w-3 h-3" />{ready ? "Claim NXT" : "Not ready"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {user && activeStakes.length === 0 && (
          <Card className="bg-slate-900/40 border-slate-700/30 p-8 text-center mb-5">
            <TrendingUp className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <div className="text-slate-500 text-sm">No active stakes yet</div>
            <div className="text-slate-600 text-xs mt-1">First mint NEXUS•WAVELENGTH, then stake for 150 NXT/epoch</div>
            <Link href="/rune-mint">
              <Button className="mt-4 bg-purple-600 hover:bg-purple-700 gap-2 text-sm">
                <Coins className="w-4 h-4" />Mint Runes First
              </Button>
            </Link>
          </Card>
        )}

        {/* Past stakes */}
        {pastStakes.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Past Stakes</div>
            <div className="space-y-2">
              {pastStakes.map((s: any) => (
                <Card key={s.id} className="bg-slate-900/40 border-slate-700/30 p-3 flex items-center gap-3 opacity-60">
                  <Badge className="bg-slate-700/50 text-slate-400 border-slate-600/30 text-[10px]">{s.status}</Badge>
                  <span className="font-mono text-xs text-slate-400">{s.runeAmount.toLocaleString()} Ψ</span>
                  <span className="text-[10px] text-slate-600 flex-1 truncate font-mono">{s.runeUtxo}</span>
                  <span className="text-amber-400 font-mono text-xs">{parseFloat(s.nxtEarned).toFixed(2)} NXT</span>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stake modal */}
        {showStake && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="bg-slate-900 border-slate-700 p-6 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />Stake NEXUS•WAVELENGTH
                </h2>
                <button onClick={() => setShowStake(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-lg p-3 text-xs text-cyan-300 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Your Rune UTXO proves you own NEXUS•WAVELENGTH on Bitcoin. Format: <span className="font-mono">840000:8473</span> or <span className="font-mono">txid:vout</span></span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Rune UTXO / Rune ID</Label>
                <Input value={form.runeUtxo} onChange={e => setForm(f => ({ ...f, runeUtxo: e.target.value }))}
                  className="bg-slate-800 border-slate-700 font-mono text-xs"
                  placeholder="840000:8473 or txid:vout"
                  data-testid="input-rune-utxo" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Amount (NEXUS•WAVELENGTH)</Label>
                <Input type="number" value={form.runeAmount} onChange={e => setForm(f => ({ ...f, runeAmount: e.target.value }))}
                  className="bg-slate-800 border-slate-700 font-mono"
                  placeholder="1000"
                  data-testid="input-rune-amount" />
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 space-y-1.5">
                <div className="flex justify-between"><span>Staking amount</span><span className="text-purple-300 font-mono">{parseInt(form.runeAmount || "0").toLocaleString()} Ψ</span></div>
                <div className="flex justify-between"><span>Yield per epoch (24h)</span><span className="text-amber-300 font-mono">{(150 * (parseInt(form.runeAmount || "0") / 1000)).toFixed(2)} NXT</span></div>
                <div className="flex justify-between"><span>Your balance</span><span className="font-mono text-white">{balRaw.toFixed(2)} NXT</span></div>
              </div>

              <Button
                onClick={() => createStake.mutate()}
                disabled={createStake.isPending || !form.runeUtxo}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-confirm-stake"
              >
                {createStake.isPending ? "Staking…" : "Start Staking"}
              </Button>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
