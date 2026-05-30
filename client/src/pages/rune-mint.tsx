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
  ArrowLeft, Gem, Bitcoin, CheckCircle2, Clock, Coins,
  Zap, ArrowRight, AlertCircle, Hash, TrendingUp, ExternalLink,
} from "lucide-react";

function fmtTime(ts: string) {
  const d = new Date(ts), now = Date.now();
  const diff = now - d.getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), day = Math.floor(h / 24);
  if (day > 0) return `${day}d ago`;
  if (h > 0)   return `${h}h ago`;
  if (m > 0)   return `${m}m ago`;
  return "just now";
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-green-500/15 text-green-300 border-green-500/20",
  pending:   "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  failed:    "bg-red-500/15 text-red-300 border-red-500/20",
};

export default function RuneMintPage() {
  const { user } = useAuth() as any;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [btcAddress, setBtcAddress] = useState("");

  const { data: runeData } = useQuery<any>({ queryKey: ["/api/rune/info"], refetchInterval: 30_000 });
  const { data: mintsData } = useQuery<any>({ queryKey: ["/api/rune/my-mints"], enabled: !!user, refetchInterval: 15_000 });
  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet"] });

  const balRaw = walletData?.wallet ? parseFloat(walletData.wallet.balance) / 1e8 : 0;
  const canAfford = balRaw >= 100;
  const pct = runeData ? ((runeData.mintCount / runeData.maxMints) * 100).toFixed(1) : "0.0";
  const isSoldOut = runeData?.remaining === 0;

  const mintMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/rune/mint", { btcAddress });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "✅ Minted!", description: `1,000 NEXUS•WAVELENGTH → Rune ID ${data.mint.runeId}` });
      setBtcAddress("");
      qc.invalidateQueries({ queryKey: ["/api/rune/my-mints"] });
      qc.invalidateQueries({ queryKey: ["/api/rune/info"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (e: any) => toast({ title: "Mint failed", description: e.message, variant: "destructive" }),
  });

  const myMints = mintsData?.mints ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/rune-etching">
            <button className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Mint NEXUS•WAVELENGTH</h1>
              <p className="text-xs text-slate-400">Pay 100 NXT → receive 1,000 Runes on Bitcoin</p>
            </div>
          </div>
          <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/20 ml-auto">Rune Protocol</Badge>
        </div>

        <ChannelConnect label="Top up ⚡" />

        {/* Progress bar */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
              <Gem className="w-4 h-4 text-purple-400" />Mint Progress
            </span>
            <span className="text-xs font-mono text-slate-500">{runeData?.mintCount ?? 0} / {runeData?.maxMints ?? 21000}</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full transition-all"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 font-mono">
            <span>{pct}% minted</span>
            <span>{runeData?.remaining ?? 21000} remaining</span>
          </div>
        </Card>

        {/* Mint terms */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "You Pay", val: "100 NXT", icon: <Zap className="w-3.5 h-3.5 text-amber-400" />, color: "text-amber-300" },
            { label: "You Receive", val: "1,000 Ψ", icon: <Gem className="w-3.5 h-3.5 text-purple-400" />, color: "text-purple-300" },
            { label: "Stake Yield", val: "150 NXT/day", icon: <TrendingUp className="w-3.5 h-3.5 text-green-400" />, color: "text-green-300" },
          ].map(t => (
            <Card key={t.label} className="bg-slate-900/60 border-slate-700/50 p-3 text-center">
              <div className="flex justify-center mb-1">{t.icon}</div>
              <div className={`text-base font-bold font-mono ${t.color}`}>{t.val}</div>
              <div className="text-[10px] text-slate-600">{t.label}</div>
            </Card>
          ))}
        </div>

        {/* Mint form */}
        {user ? (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 mb-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Bitcoin className="w-4 h-4 text-orange-400" />Mint NEXUS•WAVELENGTH
            </h2>

            {isSoldOut ? (
              <div className="flex items-center gap-2 text-amber-300 bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">All 21,000 mints are complete. Trade on the marketplace.</span>
              </div>
            ) : !canAfford ? (
              <div className="flex items-center gap-2 text-red-300 bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Need 100 NXT — you have {balRaw.toFixed(2)} NXT.
                <Link href="/lightning-wallet" className="ml-auto text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-xs whitespace-nowrap">
                  Top up <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : null}

            <div className="space-y-1.5 mb-4">
              <Label className="text-slate-400 text-xs">Your Bitcoin Address (receives the Rune)</Label>
              <Input value={btcAddress} onChange={e => setBtcAddress(e.target.value)}
                className="bg-slate-800 border-slate-700 font-mono text-xs"
                placeholder="bc1q… or 1… or 3…"
                data-testid="input-btc-address" />
              <div className="text-[10px] text-slate-600">Runes use UTXO-based accounting — provide any Bitcoin address you control.</div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 mb-4 space-y-1.5">
              <div className="flex justify-between"><span>Mint cost</span><span className="text-amber-300 font-mono">100 NXT</span></div>
              <div className="flex justify-between"><span>Your balance after</span><span className="font-mono text-white">{Math.max(0, balRaw - 100).toFixed(2)} NXT</span></div>
              <div className="flex justify-between"><span>Runes received</span><span className="text-purple-300 font-mono">1,000 NEXUS•WAVELENGTH</span></div>
              <div className="flex justify-between"><span>Rune ID</span><span className="text-slate-500 font-mono">{runeData?.runeId ?? "840000:8472"} + seq</span></div>
            </div>

            <Button
              onClick={() => mintMutation.mutate()}
              disabled={mintMutation.isPending || !btcAddress || !canAfford || isSoldOut}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="button-mint-rune"
            >
              {mintMutation.isPending ? "Minting…" : "Mint 1,000 NEXUS•WAVELENGTH — 100 NXT"}
            </Button>
          </Card>
        ) : (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 mb-5 text-center">
            <Gem className="w-10 h-10 text-purple-400 mx-auto mb-3" />
            <div className="text-slate-400 text-sm mb-3">Sign in to mint NEXUS•WAVELENGTH Runes</div>
            <Link href="/auth">
              <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                <ArrowRight className="w-4 h-4" />Sign In to Mint
              </Button>
            </Link>
          </Card>
        )}

        {/* My mints */}
        {myMints.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Your Mints</div>
            <div className="space-y-2">
              {myMints.map((m: any) => (
                <Card key={m.id} className="bg-slate-900/40 border-slate-700/40 p-3 flex items-center gap-3">
                  <Badge className={`${STATUS_STYLE[m.status] ?? STATUS_STYLE.pending} text-[10px]`}>
                    {m.status === "confirmed" ? <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> : <Clock className="w-2.5 h-2.5 mr-1" />}
                    {m.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-mono truncate">Rune {m.runeId}</div>
                    <div className="text-slate-600 text-[10px] truncate font-mono">{m.btcAddress}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-purple-300 text-xs font-mono">{m.runeAmount.toLocaleString()} Ψ</div>
                    <div className="text-slate-600 text-[10px]">{fmtTime(m.createdAt)}</div>
                  </div>
                  {m.status === "confirmed" && (
                    <Link href="/rune-staking">
                      <button className="text-cyan-500 hover:text-cyan-300 ml-1" title="Stake this Rune">
                        <TrendingUp className="w-4 h-4" />
                      </button>
                    </Link>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Nav links */}
        <div className="flex gap-3 mt-6">
          <Link href="/rune-staking" className="flex-1">
            <Card className="bg-cyan-900/10 border-cyan-500/20 p-3 hover:border-cyan-400/40 transition-colors cursor-pointer text-center">
              <TrendingUp className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <div className="text-white text-xs font-semibold">Stake Runes</div>
              <div className="text-slate-500 text-[10px]">150 NXT / epoch</div>
            </Card>
          </Link>
          <Link href="/marketplace" className="flex-1">
            <Card className="bg-amber-900/10 border-amber-500/20 p-3 hover:border-amber-400/40 transition-colors cursor-pointer text-center">
              <Hash className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-white text-xs font-semibold">Marketplace</div>
              <div className="text-slate-500 text-[10px]">Trade for NXT</div>
            </Card>
          </Link>
          <a href="https://mempool.space/runes" target="_blank" rel="noreferrer" className="flex-1">
            <Card className="bg-slate-900/40 border-slate-700/30 p-3 hover:border-slate-600/50 transition-colors cursor-pointer text-center">
              <ExternalLink className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <div className="text-white text-xs font-semibold">mempool.space</div>
              <div className="text-slate-500 text-[10px]">On-chain explorer</div>
            </Card>
          </a>
        </div>

      </div>
    </div>
  );
}
