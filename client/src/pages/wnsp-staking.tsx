import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function EpochProgress({ stakedAt, lastClaimAt }: { stakedAt: string; lastClaimAt?: string }) {
  const from = lastClaimAt ? new Date(lastClaimAt) : new Date(stakedAt);
  const elapsed = Date.now() - from.getTime();
  const epochMs = 86_400_000;
  const pct = Math.min((elapsed % epochMs) / epochMs * 100, 100);
  const hoursLeft = Math.round((epochMs - (elapsed % epochMs)) / 3_600_000);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Epoch progress</span>
        <span>{hoursLeft}h left</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function WnspStakingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inscriptionInput, setInscriptionInput] = useState("");

  const { data: wallet } = useQuery({ queryKey: ["/api/wallet"], refetchInterval: 15000 });
  const { data: stats } = useQuery({ queryKey: ["/api/staking/stats"], refetchInterval: 60000 });
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["/api/staking/positions"],
    refetchInterval: 30000,
  });

  const stakeMutation = useMutation({
    mutationFn: (inscriptionId: string) =>
      apiRequest("POST", "/api/staking/stake", { inscriptionId: inscriptionId.trim(), wnspAmount: 1000 }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      toast({ title: "Staked!", description: data.message });
      setInscriptionInput("");
      qc.invalidateQueries({ queryKey: ["/api/staking/positions"] });
      qc.invalidateQueries({ queryKey: ["/api/staking/stats"] });
    },
    onError: async (err: any) => {
      let msg = err.message;
      try { const d = await err.response?.json(); msg = d?.error ?? msg; } catch {}
      toast({ title: "Stake failed", description: msg, variant: "destructive" });
    },
  });

  const claimMutation = useMutation({
    mutationFn: (stakeId: number) => apiRequest("POST", "/api/staking/claim", { stakeId }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      toast({ title: "Claimed!", description: data.message });
      qc.invalidateQueries({ queryKey: ["/api/staking/positions"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: async (err: any) => {
      let msg = err.message;
      try { const d = await err.response?.json(); msg = d?.error ?? msg; } catch {}
      toast({ title: "Claim failed", description: msg, variant: "destructive" });
    },
  });

  const unstakeMutation = useMutation({
    mutationFn: (stakeId: number) => apiRequest("POST", "/api/staking/unstake", { stakeId }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      toast({ title: "Unstaked", description: data.message });
      qc.invalidateQueries({ queryKey: ["/api/staking/positions"] });
      qc.invalidateQueries({ queryKey: ["/api/staking/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: async (err: any) => {
      let msg = err.message;
      try { const d = await err.response?.json(); msg = d?.error ?? msg; } catch {}
      toast({ title: "Unstake failed", description: msg, variant: "destructive" });
    },
  });

  const s = stats as any;
  const activePositions = (positions as any[]).filter((p: any) => p.status === "active");
  const pastPositions = (positions as any[]).filter((p: any) => p.status !== "active");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#080810] to-[#050508] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono mb-2">
            wnsp · BRC-20 · Epoch Staking
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent">
            wnsp Staking Dashboard
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Lock your wnsp inscription ID and earn{" "}
            <span className="text-violet-300 font-semibold">100 NXT per 24-hour epoch</span>.
            Rewards are physics-governed — each epoch corresponds to one Bitcoin day cycle.
          </p>
        </div>

        {/* Protocol stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active Stakes", value: String(s?.activeStakes ?? "–"), color: "text-violet-400" },
            { label: "wnsp Staked", value: s?.totalWnspStaked ? `${Number(s.totalWnspStaked).toLocaleString()} wnsp` : "–", color: "text-fuchsia-400" },
            { label: "NXT Rewarded", value: s?.totalNxtRewarded ? `${parseFloat(s.totalNxtRewarded).toFixed(0)} NXT` : "–", color: "text-amber-400" },
            { label: "NXT per Epoch", value: `${s?.nxtPerEpoch ?? 100} NXT`, color: "text-green-400" },
          ].map((st) => (
            <Card key={st.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className={`text-xl font-bold font-mono ${st.color}`}>{st.value}</div>
                <div className="text-xs text-gray-500 mt-1">{st.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stake form */}
        <Card className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 border-violet-500/30">
          <CardHeader>
            <CardTitle className="text-violet-300 flex items-center gap-2 text-base">
              <span>💎</span> Stake a wnsp Inscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black/30 rounded-lg p-4 text-sm space-y-2 border border-white/10 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Reward per epoch</span>
                <span className="text-amber-300">100 NXT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Epoch duration</span>
                <span className="text-white">24 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lock period</span>
                <span className="text-white">None — unstake any time</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2">
                <span className="text-gray-400">Your NXT balance</span>
                <span className="text-green-300">{parseFloat((wallet as any)?.balance ?? "0").toFixed(2)} NXT</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Inscription ID (from your wnsp BRC-20 mint)</label>
              <Input
                data-testid="input-inscription-id"
                value={inscriptionInput}
                onChange={(e) => setInscriptionInput(e.target.value)}
                placeholder="e.g. 588252d8ebcdcb8542f26f944bc5f872...i0"
                className="bg-black/40 border-white/10 font-mono text-sm text-white placeholder:text-gray-600 focus:border-violet-500/50"
              />
              <p className="text-xs text-gray-500">
                Find your inscription ID on{" "}
                <a href="https://ordinals.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">ordinals.com</a> or{" "}
                <a href="https://unisat.io" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">UniSat Wallet</a>.
                Must be a valid wnsp BRC-20 inscription.
              </p>
            </div>

            <Button
              data-testid="button-stake"
              onClick={() => stakeMutation.mutate(inscriptionInput)}
              disabled={!inscriptionInput.trim() || stakeMutation.isPending}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-bold h-11 disabled:opacity-50"
            >
              {stakeMutation.isPending ? "Staking…" : "Stake Inscription → Earn 100 NXT/day"}
            </Button>
          </CardContent>
        </Card>

        {/* Active positions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/80">Active Positions ({activePositions.length})</h2>
          {isLoading ? (
            <div className="text-gray-500 text-sm text-center py-8">Loading positions…</div>
          ) : activePositions.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-10 text-center text-gray-500 text-sm">
                No active stakes yet. Stake your wnsp inscription above to start earning NXT.
              </CardContent>
            </Card>
          ) : (
            activePositions.map((pos: any) => (
              <Card key={pos.id} data-testid={`stake-card-${pos.id}`}
                className="bg-gradient-to-r from-violet-900/10 to-fuchsia-900/10 border-violet-500/20">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300 border border-green-500/30 font-mono">ACTIVE</span>
                        <span className="text-xs text-gray-400 font-mono">#{pos.id}</span>
                      </div>
                      <div className="font-mono text-xs text-gray-400 truncate">{pos.inscriptionId}</div>
                      <div className="text-xs text-gray-500">Staked {new Date(pos.stakedAt).toLocaleDateString()} · {pos.epochsCompleted} epochs completed</div>
                    </div>
                    <div className="text-right space-y-1 flex-shrink-0">
                      <div className="text-lg font-bold font-mono text-amber-300">{parseFloat(pos.pendingReward).toFixed(2)} NXT</div>
                      <div className="text-xs text-gray-500">pending ({pos.pendingEpochs} epoch{pos.pendingEpochs !== 1 ? "s" : ""})</div>
                      <div className="text-xs text-gray-500">Total earned: {parseFloat(pos.nxtEarned).toFixed(2)} NXT</div>
                    </div>
                  </div>

                  <EpochProgress stakedAt={pos.stakedAt} lastClaimAt={pos.lastClaimAt} />

                  <div className="flex gap-2">
                    <Button
                      data-testid={`button-claim-${pos.id}`}
                      size="sm"
                      onClick={() => claimMutation.mutate(pos.id)}
                      disabled={pos.pendingEpochs === 0 || claimMutation.isPending}
                      className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 disabled:opacity-40"
                    >
                      {claimMutation.isPending ? "Claiming…" : `Claim ${parseFloat(pos.pendingReward).toFixed(2)} NXT`}
                    </Button>
                    <Button
                      data-testid={`button-unstake-${pos.id}`}
                      size="sm"
                      variant="outline"
                      onClick={() => unstakeMutation.mutate(pos.id)}
                      disabled={unstakeMutation.isPending}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      Unstake
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Past positions */}
        {pastPositions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500">Past Positions</h2>
            {pastPositions.map((pos: any) => (
              <div key={pos.id} className="flex items-center justify-between bg-white/3 rounded p-3 border border-white/5 text-xs text-gray-500 font-mono">
                <div className="truncate flex-1">{pos.inscriptionId}</div>
                <div className="ml-4 flex-shrink-0 space-x-3">
                  <span>Earned: {parseFloat(pos.nxtEarned).toFixed(2)} NXT</span>
                  <span className="text-gray-600">UNSTAKED</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* How it works */}
        <Card className="bg-white/3 border-white/5">
          <CardContent className="p-5 grid sm:grid-cols-3 gap-5 text-sm">
            {[
              { icon: "💎", title: "Epoch-Based Rewards", body: "Every 24-hour epoch that your inscription remains staked earns you 100 NXT. Epochs are based on wall-clock time, not Bitcoin block height." },
              { icon: "⚡", title: "Physics Governance", body: "Reward rates are governed by the WNSP physics engine. Future epochs may have variable rates based on staking participation and protocol compression state." },
              { icon: "🔓", title: "No Lock-Up", body: "Unstake any time. Pending rewards are auto-claimed on unstake. Your inscription ID is just registered — you retain full on-chain ownership." },
            ].map((item) => (
              <div key={item.title} className="space-y-1">
                <div className="font-semibold text-white/60">{item.icon} {item.title}</div>
                <div className="text-gray-500 text-xs leading-relaxed">{item.body}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
