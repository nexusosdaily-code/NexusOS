import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChannelConnect } from "@/components/channel-connect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const MINT_FEE = "50";
const MINT_AMT = "1000";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-300 border-green-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border font-mono ${map[status] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
      {status}
    </span>
  );
}

export default function CommunityMintPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [justMinted, setJustMinted] = useState<any>(null);

  const { data: wallet } = useQuery({
    queryKey: ["/api/wallet"],
    refetchInterval: 15000,
  });

  const { data: myMints = [], isLoading: mintsLoading } = useQuery({
    queryKey: ["/api/community/mints"],
    refetchInterval: 30000,
  });

  const { data: allMints = [] } = useQuery({
    queryKey: ["/api/community/mints/all"],
    refetchInterval: 60000,
  });

  const { data: stats } = useQuery({ queryKey: ["/api/staking/stats"] });

  const mintMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/community/mint", {}),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setJustMinted(data);
      toast({ title: "Mint queued!", description: data.message });
      qc.invalidateQueries({ queryKey: ["/api/community/mints"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: async (err: any) => {
      let msg = err.message;
      try { const d = await err.response?.json(); msg = d?.error ?? msg; } catch {}
      toast({ title: "Mint failed", description: msg, variant: "destructive" });
    },
  });

  const bal = parseFloat((wallet as any)?.balance ?? "0");
  const canMint = bal >= parseFloat(MINT_FEE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#080810] to-[#050508] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono mb-2">
            BRC-20 · wnsp · Bitcoin Ordinals
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
            Community Mint Portal
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Mint <span className="text-orange-300 font-semibold">1,000 wnsp</span> directly onto Bitcoin.
            Pay <span className="text-amber-300 font-semibold">50 NXT</span> — burned to the protocol.
            Your inscription is queued and auto-inscribed by the NexusOS service wallet.
          </p>
        </div>

        <ChannelConnect requiredNxt={50} label="Top up ⚡" />

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Mint Amount", value: `${MINT_AMT} wnsp`, color: "text-orange-400" },
            { label: "NXT Fee (Burned)", value: `${MINT_FEE} NXT`, color: "text-amber-400" },
            { label: "Total Community Mints", value: String((allMints as any[]).length), color: "text-green-400" },
            { label: "Your Balance", value: `${bal.toFixed(2)} NXT`, color: canMint ? "text-green-400" : "text-red-400" },
          ].map((s) => (
            <Card key={s.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mint card */}
        <Card className="bg-gradient-to-br from-orange-900/20 to-amber-900/10 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-orange-300 flex items-center gap-2">
              <span>🟠</span> Mint wnsp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-black/30 rounded-lg p-4 space-y-2 font-mono text-sm border border-white/10">
              <div className="flex justify-between">
                <span className="text-gray-400">Token</span>
                <span className="text-orange-300">wnsp (BRC-20)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Operation</span>
                <span className="text-white">mint</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount</span>
                <span className="text-green-300">{MINT_AMT} wnsp</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2">
                <span className="text-gray-400">NXT Fee (Burned)</span>
                <span className="text-amber-300">{MINT_FEE} NXT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Balance</span>
                <span className={canMint ? "text-green-300" : "text-red-300"}>{bal.toFixed(8)} NXT</span>
              </div>
            </div>

            {!canMint && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded p-3">
                ⚠ Insufficient NXT balance. You need {MINT_FEE} NXT to mint. Current: {bal.toFixed(2)} NXT.
              </div>
            )}

            {justMinted && (
              <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded p-3 space-y-1">
                <div className="font-semibold">✓ Mint queued successfully!</div>
                <div className="font-mono text-xs text-gray-400">Queue ID: #{justMinted.queueId ?? justMinted.mintId}</div>
                <div className="text-xs text-gray-400">Your inscription will appear on Bitcoin once confirmed. Check "My Mints" below.</div>
              </div>
            )}

            <Button
              data-testid="button-community-mint"
              onClick={() => mintMutation.mutate()}
              disabled={!canMint || mintMutation.isPending}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold h-12 text-base disabled:opacity-50"
            >
              {mintMutation.isPending ? "Queuing inscription…" : `Mint 1,000 wnsp — Burn ${MINT_FEE} NXT`}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Fee is burned to the NexusOS protocol. Inscription inscribed by the service wallet on Bitcoin mainnet.
            </p>
          </CardContent>
        </Card>

        {/* My Mints */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white/80 text-base">My Mints</CardTitle>
          </CardHeader>
          <CardContent>
            {mintsLoading ? (
              <div className="text-gray-500 text-sm text-center py-6">Loading…</div>
            ) : (myMints as any[]).length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">No mints yet. Be the first to mint wnsp!</div>
            ) : (
              <div className="space-y-2">
                {(myMints as any[]).map((m: any) => (
                  <div key={m.id} data-testid={`mint-row-${m.id}`}
                    className="flex items-center justify-between bg-black/30 rounded p-3 border border-white/5 text-sm">
                    <div className="space-y-0.5">
                      <div className="font-mono text-xs text-gray-400">Mint #{m.id} · Q#{m.queueId ?? "–"}</div>
                      {m.inscriptionId && (
                        <a href={`https://ordinals.com/inscription/${m.inscriptionId}`} target="_blank" rel="noreferrer"
                          className="text-orange-400 text-xs font-mono hover:underline">
                          {m.inscriptionId.slice(0, 24)}…
                        </a>
                      )}
                      <div className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={m.queueStatus ?? m.status} />
                      <div className="text-xs text-amber-400 font-mono">{m.nxtFeePaid} NXT burned</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Community Feed */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white/80 text-base">Community Feed — Latest Mints</CardTitle>
          </CardHeader>
          <CardContent>
            {(allMints as any[]).length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-6">No community mints yet.</div>
            ) : (
              <div className="space-y-1.5">
                {(allMints as any[]).slice(0, 20).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded bg-black/20 border border-white/5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-orange-400 font-mono">@{m.username}</span>
                      <span className="text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-mono">+1,000 wnsp</span>
                      <StatusBadge status={m.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info section */}
        <Card className="bg-white/3 border-white/5">
          <CardContent className="p-5 grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { icon: "🟠", title: "BRC-20 Standard", body: "wnsp follows the BRC-20 protocol. Inscriptions are permanent on Bitcoin mainnet. Max supply: 50,000 wnsp (50 × 1,000 mints)." },
              { icon: "🔥", title: "NXT Burn Mechanic", body: `${MINT_FEE} NXT is burned from your wallet for each mint. This reduces supply and anchors wnsp value to NXT activity.` },
              { icon: "⛓", title: "Auto-Inscribed", body: "NexusOS service wallet auto-inscribes your BRC-20 mint transaction on Bitcoin using the ordinals protocol. No BTC wallet needed." },
            ].map((item) => (
              <div key={item.title} className="space-y-1">
                <div className="font-semibold text-white/70">{item.icon} {item.title}</div>
                <div className="text-gray-500 text-xs leading-relaxed">{item.body}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
