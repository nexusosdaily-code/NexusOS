import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const SERVICE_ADDR = "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m";

export default function FractalBtcBridgePage() {
  const { toast } = useToast();
  const [lookupAddr, setLookupAddr] = useState(SERVICE_ADDR);
  const [inscContent, setInscContent] = useState("");
  const [receiverAddr, setReceiverAddr] = useState("");
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: feeData, isLoading: feeLoading } = useQuery({
    queryKey: ["/api/fractal/fee-rate"],
    retry: false,
  });

  const { data: balData, isLoading: balLoading, refetch: refetchBal } = useQuery({
    queryKey: [`/api/fractal/balance/${lookupAddr}`],
    enabled: !!lookupAddr,
    retry: false,
  });

  const { data: inscrData, isLoading: inscrLoading } = useQuery({
    queryKey: [`/api/fractal/inscriptions/${lookupAddr}`],
    enabled: !!lookupAddr,
    retry: false,
  });

  const inscribeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/fractal/inscribe", {
      content: inscContent,
      contentType: "text/plain",
      receiverAddress: receiverAddr,
    }),
    onSuccess: async (res: any) => {
      const d = await res.json();
      setLastResult(d);
      toast({ title: "Queued for Fractal Bitcoin", description: `Queue ID: #${d.queued?.id ?? "pending"}` });
    },
    onError: async (err: any) => {
      let msg = err.message;
      try { const d = await err.response?.json(); msg = d?.error ?? msg; } catch {}
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const fees = feeData as any;
  const bal = balData as any;
  const inscr = inscrData as any;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#080810] to-[#050508] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-2">
            Fractal Bitcoin · L2 Ordinals · WNSP Bridge
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
            Fractal Bitcoin Bridge
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Fractal Bitcoin is Bitcoin's first native L2 scaling solution, using the same Taproot inscription
            format as mainnet. Bridge NexusOS events and inscriptions to both networks.
          </p>
        </div>

        {/* Network comparison */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-orange-900/10 border-orange-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-300 text-sm flex items-center gap-2">🟠 Bitcoin Mainnet</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5 text-gray-400">
              <div className="flex justify-between"><span>Block time</span><span className="text-white">~10 min</span></div>
              <div className="flex justify-between"><span>Finality</span><span className="text-white">6 blocks (~1h)</span></div>
              <div className="flex justify-between"><span>BRC-20 support</span><span className="text-green-400">✓ live</span></div>
              <div className="flex justify-between"><span>wnsp deployed</span><span className="text-green-400">✓ inscription #48</span></div>
            </CardContent>
          </Card>
          <Card className="bg-cyan-900/10 border-cyan-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-300 text-sm flex items-center gap-2">🔵 Fractal Bitcoin (L2)</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5 text-gray-400">
              <div className="flex justify-between"><span>Block time</span><span className="text-white">~30 sec</span></div>
              <div className="flex justify-between"><span>Finality</span><span className="text-white">~5 min</span></div>
              <div className="flex justify-between"><span>BRC-20 support</span><span className="text-green-400">✓ same format</span></div>
              <div className="flex justify-between"><span>Inscription format</span><span className="text-white">Taproot (identical)</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Fee rates */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-cyan-300 text-base">Fractal Bitcoin Fee Rates</CardTitle>
          </CardHeader>
          <CardContent>
            {feeLoading ? (
              <div className="text-gray-500 text-sm text-center py-4">Fetching from Fractal mempool…</div>
            ) : fees ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Fast (1 block)", value: fees.fastestFee, color: "text-red-400" },
                  { label: "Medium (3 blocks)", value: fees.halfHourFee, color: "text-yellow-400" },
                  { label: "Slow (6 blocks)", value: fees.hourFee, color: "text-green-400" },
                ].map((f) => (
                  <div key={f.label} className="bg-black/30 rounded p-3 text-center border border-white/10">
                    <div className={`text-2xl font-bold font-mono ${f.color}`}>{f.value}</div>
                    <div className="text-xs text-gray-500 mt-1">sat/vbyte</div>
                    <div className="text-xs text-gray-600">{f.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                ⚠ Fractal mempool unreachable. Check{" "}
                <a href="https://mempool.fractalbitcoin.io" target="_blank" rel="noreferrer" className="underline">
                  mempool.fractalbitcoin.io
                </a> directly.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address lookup */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white/80 text-base">Address Lookup — Fractal Bitcoin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                data-testid="input-fractal-address"
                value={lookupAddr}
                onChange={(e) => setLookupAddr(e.target.value)}
                placeholder="bc1p… Taproot address"
                className="bg-black/40 border-white/10 font-mono text-sm text-white"
              />
              <Button onClick={() => refetchBal()} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                Lookup
              </Button>
            </div>

            {balLoading && <div className="text-gray-500 text-sm">Loading balance…</div>}
            {bal && !bal.error && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Confirmed", value: `${(bal.confirmed ?? 0).toLocaleString()} sats`, color: "text-green-400" },
                  { label: "Unconfirmed", value: `${(bal.unconfirmed ?? 0).toLocaleString()} sats`, color: "text-yellow-400" },
                  { label: "Transactions", value: String(bal.txCount ?? 0), color: "text-cyan-400" },
                ].map((item) => (
                  <div key={item.label} className="bg-black/30 rounded p-3 text-center border border-white/10">
                    <div className={`text-lg font-bold font-mono ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            )}
            {bal?.error && (
              <div className="text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                ⚠ {bal.error}
              </div>
            )}

            {inscr && !inscr.error && inscr.inscriptions?.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-gray-400">Inscriptions on Fractal Bitcoin ({inscr.total ?? inscr.inscriptions.length})</div>
                {inscr.inscriptions.slice(0, 5).map((i: any, idx: number) => (
                  <div key={idx} className="bg-black/20 rounded p-2 font-mono text-xs text-gray-400 border border-white/5">
                    {typeof i === "string" ? i : JSON.stringify(i)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inscribe to Fractal */}
        <Card className="bg-gradient-to-br from-cyan-900/20 to-blue-900/10 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-300 text-base flex items-center gap-2">
              <span>⛓</span> Inscribe to Fractal Bitcoin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">
              Same Taproot inscription format as Bitcoin mainnet. Content is inscribed via the NexusOS service wallet
              using the slow fee tier.
            </p>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Content (JSON or plain text)</label>
              <Textarea
                data-testid="input-fractal-content"
                value={inscContent}
                onChange={(e) => setInscContent(e.target.value)}
                placeholder={'{"p":"brc-20","op":"mint","tick":"wnsp","amt":"1000"}'}
                rows={3}
                className="bg-black/40 border-white/10 font-mono text-sm text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Receiver Address (Fractal Bitcoin Taproot)</label>
              <Input
                data-testid="input-fractal-receiver"
                value={receiverAddr}
                onChange={(e) => setReceiverAddr(e.target.value)}
                placeholder="bc1p…"
                className="bg-black/40 border-white/10 font-mono text-sm text-white"
              />
            </div>

            {lastResult && (
              <div className="bg-green-500/10 border border-green-500/20 rounded p-3 text-green-400 text-sm space-y-1">
                <div className="font-semibold">✓ Queued for Fractal Bitcoin inscription</div>
                <div className="font-mono text-xs text-gray-400">Queue ID: #{lastResult.queued?.id}</div>
                <div className="text-xs text-gray-500">{lastResult.note}</div>
              </div>
            )}

            <Button
              data-testid="button-fractal-inscribe"
              onClick={() => inscribeMutation.mutate()}
              disabled={!inscContent.trim() || !receiverAddr.trim() || inscribeMutation.isPending}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold h-11 disabled:opacity-50"
            >
              {inscribeMutation.isPending ? "Queuing…" : "Inscribe to Fractal Bitcoin"}
            </Button>
          </CardContent>
        </Card>

        {/* Explorer links */}
        <Card className="bg-white/3 border-white/5">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-white/60 mb-3">Fractal Bitcoin Explorers</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { name: "Fractal Mempool", url: "https://mempool.fractalbitcoin.io", desc: "Block explorer & fee tracker" },
                { name: "UniSat Fractal", url: "https://fractal.unisat.io", desc: "BRC-20 & ordinals on Fractal" },
                { name: "OKX Fractal Explorer", url: "https://www.oklink.com/fractal-bitcoin", desc: "Full chain analytics" },
                { name: "Fractal Bitcoin Docs", url: "https://docs.fractalbitcoin.io", desc: "Official documentation" },
              ].map((link) => (
                <a key={link.name} href={link.url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between bg-black/20 rounded p-3 border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors">
                  <div>
                    <div className="text-cyan-400 text-sm font-medium">{link.name}</div>
                    <div className="text-gray-500 text-xs">{link.desc}</div>
                  </div>
                  <span className="text-gray-600 text-xs">↗</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
