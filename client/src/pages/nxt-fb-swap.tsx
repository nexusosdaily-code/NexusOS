import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ── Physics-governed rate badge ──────────────────────────────────────────────
function RateBadge({ rate }: { rate: any }) {
  if (!rate) return null;
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 font-mono text-sm">
      <span className="text-amber-300">1 NXT</span>
      <span className="text-gray-500">↔</span>
      <span className="text-orange-300">{rate.wnspPerNxt} wnsp</span>
      <span className="text-gray-600">|</span>
      <span className="text-gray-400 text-xs">Physics rate · Fractal BTC</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:      "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    broadcasting: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    confirmed:    "bg-green-500/20 text-green-300 border-green-500/30",
    failed:       "bg-red-500/20 text-red-300 border-red-500/30",
    refunded:     "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border font-mono ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

// ── Direction toggle ──────────────────────────────────────────────────────────
type Dir = "nxt_to_fb" | "fb_to_nxt";

export default function NxtFbSwapPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dir, setDir] = useState<Dir>("nxt_to_fb");
  const [nxtAmt, setNxtAmt] = useState("100");
  const [wnspAmt, setWnspAmt] = useState("2000");
  const [fractalAddr, setFractalAddr] = useState("");
  const [fractalTxHash, setFractalTxHash] = useState("");
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: rate } = useQuery({ queryKey: ["/api/swap/rate"] });
  const { data: wallet } = useQuery({ queryKey: ["/api/wallet"], refetchInterval: 15000 });
  const { data: stats } = useQuery({ queryKey: ["/api/swap/stats"], refetchInterval: 60000 });
  const { data: history = [], isLoading: histLoading } = useQuery({
    queryKey: ["/api/swap/history"],
    refetchInterval: 30000,
  });

  const r = rate as any;
  const w = wallet as any;
  const s = stats as any;
  const wnspPerNxt = r?.wnspPerNxt ?? 20;
  const nxtPerWnsp = r?.nxtPerWnsp ?? 0.05;

  // Derived preview
  const nxtNum = parseFloat(nxtAmt) || 0;
  const wnspPreview = Math.floor(nxtNum * wnspPerNxt);
  const wnspNum = parseInt(wnspAmt) || 0;
  const nxtPreview = (wnspNum * nxtPerWnsp).toFixed(2);
  const balance = parseFloat(w?.balance ?? "0");
  const canSwapAtoB = dir === "nxt_to_fb" && nxtNum >= (r?.minNxt ?? 5) && balance >= nxtNum;

  const swapAtoBMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/swap/nxt-to-fb", {
      nxtAmount: nxtNum,
      fractalAddress: fractalAddr.trim(),
    }),
    onSuccess: async (res: any) => {
      const d = await res.json();
      setLastResult(d);
      toast({ title: "Swap queued!", description: d.message });
      qc.invalidateQueries({ queryKey: ["/api/swap/history"] });
      qc.invalidateQueries({ queryKey: ["/api/swap/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: async (err: any) => {
      let msg = err.message;
      try { const d = await err.response?.json(); msg = d?.error ?? msg; } catch {}
      toast({ title: "Swap failed", description: msg, variant: "destructive" });
    },
  });

  const swapBtoAMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/swap/fb-to-nxt", {
      fractalTxHash: fractalTxHash.trim(),
      wnspAmount: wnspNum,
      fractalAddress: fractalAddr.trim(),
    }),
    onSuccess: async (res: any) => {
      const d = await res.json();
      setLastResult(d);
      toast({ title: d.verified ? "NXT credited!" : "Swap submitted!", description: d.message });
      qc.invalidateQueries({ queryKey: ["/api/swap/history"] });
      qc.invalidateQueries({ queryKey: ["/api/swap/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: async (err: any) => {
      let msg = err.message;
      try { const d = await err.response?.json(); msg = d?.error ?? msg; } catch {}
      toast({ title: "Swap failed", description: msg, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#080810] to-[#050508] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono mb-2">
            NXT ↔ wnsp · Fractal Bitcoin · Atomic Swap
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
            NXT ↔ Fractal Bitcoin Bridge
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
            Swap NXT for wnsp inscribed on Fractal Bitcoin — or redeem Fractal Bitcoin wnsp back to NXT.
            Physics-governed rate. No custodian. The service wallet inscribes directly to your Fractal address.
          </p>
          <RateBadge rate={r} />
        </div>

        {/* Protocol stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Swaps",    value: String(s?.totalSwaps ?? "–"),           color: "text-indigo-400" },
            { label: "NXT Volume",     value: s?.nxtVolume ? `${parseFloat(s.nxtVolume).toFixed(0)} NXT` : "–", color: "text-amber-400" },
            { label: "wnsp Bridged",   value: s?.wnspBridged ? `${Number(s.wnspBridged).toLocaleString()} wnsp` : "–", color: "text-orange-400" },
            { label: "Your Balance",   value: `${balance.toFixed(2)} NXT`, color: "text-green-400" },
          ].map((st) => (
            <Card key={st.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className={`text-xl font-bold font-mono ${st.color}`}>{st.value}</div>
                <div className="text-xs text-gray-500 mt-1">{st.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main swap card */}
        <Card className="bg-gradient-to-br from-indigo-900/20 to-violet-900/10 border-indigo-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-indigo-300 text-base">Swap</CardTitle>
              {/* Direction toggle */}
              <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs font-mono">
                <button
                  onClick={() => { setDir("nxt_to_fb"); setLastResult(null); }}
                  className={`px-3 py-1.5 transition-colors ${dir === "nxt_to_fb" ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}
                  data-testid="button-dir-nxt-to-fb"
                >
                  NXT → wnsp
                </button>
                <button
                  onClick={() => { setDir("fb_to_nxt"); setLastResult(null); }}
                  className={`px-3 py-1.5 transition-colors ${dir === "fb_to_nxt" ? "bg-fuchsia-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}
                  data-testid="button-dir-fb-to-nxt"
                >
                  wnsp → NXT
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* ── Direction A: NXT → wnsp on Fractal Bitcoin ── */}
            {dir === "nxt_to_fb" && (
              <>
                <div className="bg-black/30 rounded-lg border border-white/10 p-4 space-y-4">
                  {/* You pay */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">You burn (NXT)</label>
                    <div className="flex gap-2">
                      <Input
                        data-testid="input-nxt-amount"
                        type="number"
                        value={nxtAmt}
                        onChange={(e) => setNxtAmt(e.target.value)}
                        min={r?.minNxt ?? 5}
                        max={r?.maxNxt ?? 10000}
                        className="bg-black/40 border-white/10 font-mono text-amber-300 text-lg focus:border-indigo-500/50"
                        placeholder="100"
                      />
                      <div className="flex items-center px-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-sm whitespace-nowrap">
                        NXT
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Balance: {balance.toFixed(2)} NXT · Min: {r?.minNxt ?? 5} · Max: {r?.maxNxt ?? 10000}</div>
                  </div>

                  {/* Arrow */}
                  <div className="text-center text-gray-600 text-lg">↓</div>

                  {/* You receive */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">You receive (wnsp on Fractal Bitcoin)</label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2 rounded bg-orange-500/10 border border-orange-500/20 font-mono text-orange-300 text-lg">
                        {nxtNum > 0 ? wnspPreview.toLocaleString() : "–"}
                      </div>
                      <div className="flex items-center px-3 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300 font-mono text-sm whitespace-nowrap">
                        wnsp
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Rate: 1 NXT = {wnspPerNxt} wnsp · inscribed as BRC-20 on Fractal Bitcoin</div>
                  </div>

                  {/* Fractal Bitcoin address */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Your Fractal Bitcoin address (receives wnsp)</label>
                    <Input
                      data-testid="input-fractal-address-swap"
                      value={fractalAddr}
                      onChange={(e) => setFractalAddr(e.target.value)}
                      placeholder="bc1p… (Taproot address)"
                      className="bg-black/40 border-white/10 font-mono text-sm text-white placeholder:text-gray-600 focus:border-indigo-500/50"
                    />
                    <p className="text-xs text-gray-600">
                      Get a Fractal Bitcoin address from{" "}
                      <a href="https://fractal.unisat.io" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">UniSat Fractal</a> or{" "}
                      <a href="https://www.okx.com/web3" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">OKX Web3</a>
                    </p>
                  </div>
                </div>

                {!canSwapAtoB && nxtNum > 0 && balance < nxtNum && (
                  <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded p-3">
                    ⚠ Insufficient NXT. You have {balance.toFixed(2)} NXT, need {nxtNum} NXT.
                  </div>
                )}

                {lastResult && lastResult.direction === "nxt_to_fb" && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded p-3 text-green-400 text-sm space-y-1">
                    <div className="font-semibold">✓ Swap queued!</div>
                    <div className="font-mono text-xs text-gray-400">Swap ID: #{lastResult.swapId} · Queue: #{lastResult.queueId}</div>
                    <div className="text-xs">{lastResult.wnspOut.toLocaleString()} wnsp will be inscribed to Fractal Bitcoin. New balance: {parseFloat(lastResult.newBalance).toFixed(2)} NXT.</div>
                  </div>
                )}

                <Button
                  data-testid="button-swap-nxt-to-fb"
                  onClick={() => swapAtoBMutation.mutate()}
                  disabled={!canSwapAtoB || !fractalAddr.startsWith("bc1") || swapAtoBMutation.isPending}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white disabled:opacity-40"
                >
                  {swapAtoBMutation.isPending
                    ? "Queueing inscription…"
                    : nxtNum > 0 ? `Burn ${nxtNum} NXT → Get ${wnspPreview.toLocaleString()} wnsp on Fractal BTC` : "Enter amount"}
                </Button>
              </>
            )}

            {/* ── Direction B: wnsp on Fractal Bitcoin → NXT ── */}
            {dir === "fb_to_nxt" && (
              <>
                <div className="bg-black/30 rounded-lg border border-white/10 p-4 space-y-4">
                  <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                    <strong>How it works:</strong> Send your wnsp BRC-20 transfer inscription to the bridge address on Fractal Bitcoin, then submit the transaction hash below. NXT is credited once the TX is confirmed on-chain.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Bridge deposit address (Fractal Bitcoin)</label>
                    <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded px-3 py-2">
                      <span className="font-mono text-xs text-orange-300 break-all">{r?.bridgeAddress ?? "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m"}</span>
                    </div>
                    <p className="text-xs text-gray-600">Send a BRC-20 wnsp transfer to this address on Fractal Bitcoin, then paste the TX hash below.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">wnsp amount you're sending</label>
                    <div className="flex gap-2">
                      <Input
                        data-testid="input-wnsp-amount"
                        type="number"
                        value={wnspAmt}
                        onChange={(e) => setWnspAmt(e.target.value)}
                        min={1}
                        className="bg-black/40 border-white/10 font-mono text-orange-300 text-lg focus:border-fuchsia-500/50"
                        placeholder="1000"
                      />
                      <div className="flex items-center px-3 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300 font-mono text-sm whitespace-nowrap">
                        wnsp
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      You'll receive: <span className="text-amber-300 font-mono">{wnspNum > 0 ? nxtPreview : "–"} NXT</span> at rate {nxtPerWnsp} NXT/wnsp
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Your Fractal Bitcoin sender address</label>
                    <Input
                      data-testid="input-fb-sender"
                      value={fractalAddr}
                      onChange={(e) => setFractalAddr(e.target.value)}
                      placeholder="bc1p… (your Fractal Bitcoin address)"
                      className="bg-black/40 border-white/10 font-mono text-sm text-white focus:border-fuchsia-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Fractal Bitcoin transaction hash</label>
                    <Input
                      data-testid="input-fractal-tx-hash"
                      value={fractalTxHash}
                      onChange={(e) => setFractalTxHash(e.target.value)}
                      placeholder="64-char hex transaction ID"
                      className="bg-black/40 border-white/10 font-mono text-sm text-white focus:border-fuchsia-500/50"
                    />
                    <p className="text-xs text-gray-600">
                      Find your TX hash at{" "}
                      <a href="https://mempool.fractalbitcoin.io" target="_blank" rel="noreferrer" className="text-fuchsia-400 hover:underline">mempool.fractalbitcoin.io</a>
                    </p>
                  </div>
                </div>

                {lastResult && lastResult.direction === "fb_to_nxt" && (
                  <div className={`text-sm rounded p-3 border space-y-1 ${lastResult.verified ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"}`}>
                    <div className="font-semibold">{lastResult.verified ? "✓ NXT credited!" : "⏳ Swap pending verification"}</div>
                    <div className="font-mono text-xs text-gray-400">Swap ID: #{lastResult.swapId}</div>
                    <div className="text-xs">{lastResult.message}</div>
                  </div>
                )}

                <Button
                  data-testid="button-swap-fb-to-nxt"
                  onClick={() => swapBtoAMutation.mutate()}
                  disabled={!fractalTxHash.trim() || !fractalAddr.trim() || wnspNum < 1 || swapBtoAMutation.isPending}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white disabled:opacity-40"
                >
                  {swapBtoAMutation.isPending ? "Verifying on Fractal Bitcoin…" : `Redeem ${wnspNum.toLocaleString()} wnsp → ${nxtPreview} NXT`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Swap History */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white/70 text-base">Your Swap History</CardTitle>
          </CardHeader>
          <CardContent>
            {histLoading ? (
              <div className="text-gray-500 text-sm text-center py-6">Loading…</div>
            ) : (history as any[]).length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">No swaps yet. Make your first swap above.</div>
            ) : (
              <div className="space-y-2">
                {(history as any[]).map((swap: any) => (
                  <div key={swap.id} data-testid={`swap-row-${swap.id}`}
                    className="flex items-center justify-between bg-black/30 rounded p-3 border border-white/5 text-sm gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">#{swap.id}</span>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${swap.direction === "nxt_to_fb" ? "bg-indigo-500/20 text-indigo-300" : "bg-fuchsia-500/20 text-fuchsia-300"}`}>
                          {swap.direction === "nxt_to_fb" ? "NXT→wnsp" : "wnsp→NXT"}
                        </span>
                        <StatusPill status={swap.queueStatus ?? swap.status} />
                      </div>
                      <div className="font-mono text-xs text-gray-400 truncate">{swap.fractalAddress}</div>
                      {swap.inscriptionId && (
                        <a href={`https://fractal.unisat.io/inscription/${swap.inscriptionId}`} target="_blank" rel="noreferrer"
                          className="text-orange-400 text-xs font-mono hover:underline truncate block">
                          {swap.inscriptionId.slice(0, 28)}…
                        </a>
                      )}
                      <div className="text-xs text-gray-600">{new Date(swap.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      {swap.direction === "nxt_to_fb" ? (
                        <>
                          <div className="text-xs text-amber-400 font-mono">−{parseFloat(swap.nxtAmount).toFixed(2)} NXT</div>
                          <div className="text-xs text-orange-400 font-mono">+{Number(swap.wnspAmount).toLocaleString()} wnsp</div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-orange-400 font-mono">−{Number(swap.wnspAmount).toLocaleString()} wnsp</div>
                          <div className="text-xs text-amber-400 font-mono">+{parseFloat(swap.nxtAmount).toFixed(2)} NXT</div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="bg-indigo-900/10 border-indigo-500/20">
            <CardContent className="p-5 space-y-3">
              <div className="font-semibold text-indigo-300">🔵 NXT → wnsp on Fractal Bitcoin</div>
              <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
                <li>Enter NXT amount and your Fractal Bitcoin address</li>
                <li>NXT is burned from your NexusOS wallet immediately</li>
                <li>NexusOS service wallet inscribes wnsp BRC-20 mint to your Fractal address</li>
                <li>Inscription confirms on Fractal Bitcoin (~30s blocks)</li>
                <li>wnsp appears in your Fractal Bitcoin wallet (UniSat / OKX)</li>
              </ol>
            </CardContent>
          </Card>
          <Card className="bg-fuchsia-900/10 border-fuchsia-500/20">
            <CardContent className="p-5 space-y-3">
              <div className="font-semibold text-fuchsia-300">🟣 wnsp (Fractal) → NXT</div>
              <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
                <li>Send wnsp BRC-20 transfer to the bridge address on Fractal Bitcoin</li>
                <li>Copy the transaction hash from the Fractal mempool explorer</li>
                <li>Paste TX hash above and submit</li>
                <li>NexusOS verifies the TX on Fractal Bitcoin mempool</li>
                <li>NXT credited to your NexusOS wallet upon confirmation</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Supported wallets */}
        <Card className="bg-white/3 border-white/5">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-white/50 mb-3">Compatible Fractal Bitcoin Wallets</div>
            <div className="grid sm:grid-cols-3 gap-2">
              {[
                { name: "UniSat Fractal", url: "https://fractal.unisat.io", desc: "Primary Fractal BTC wallet + BRC-20 support", badge: "Recommended" },
                { name: "OKX Web3", url: "https://www.okx.com/web3", desc: "Cross-chain wallet, Fractal Bitcoin native", badge: "" },
                { name: "Xverse", url: "https://www.xverse.app", desc: "Bitcoin-native wallet with Taproot support", badge: "" },
              ].map((wallet) => (
                <a key={wallet.name} href={wallet.url} target="_blank" rel="noreferrer"
                  className="flex flex-col gap-1 bg-black/20 rounded p-3 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 text-sm font-medium">{wallet.name}</span>
                    {wallet.badge && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/20">{wallet.badge}</span>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs">{wallet.desc}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
