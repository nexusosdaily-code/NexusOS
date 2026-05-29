import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Zap, ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft,
  Clock, CheckCircle2, XCircle, Copy, RefreshCw, AlertTriangle,
  Wallet, Bitcoin,
} from "lucide-react";

const TABS = ["deposit", "withdraw", "swap", "history"] as const;
type Tab = typeof TABS[number];

function satsDisplay(sats: number) {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(4)}M`;
  if (sats >= 1_000)     return `${(sats / 1_000).toFixed(3)}K`;
  return String(sats);
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
  if (status === "failed")    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

function typeLabel(type: string) {
  if (type === "deposit")      return "⚡ Deposit";
  if (type === "withdrawal")   return "↑ Withdraw";
  if (type === "swap_to_nxt")  return "⇄ → NXT";
  if (type === "swap_to_sats") return "⇄ → Sats";
  return type;
}

export default function LightningWalletPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("deposit");

  // Deposit state
  const [depositSats, setDepositSats]   = useState("10000");
  const [depositMemo, setDepositMemo]   = useState("");
  const [invoice, setInvoice]           = useState<{ paymentRequest: string; paymentHash: string; txId: number } | null>(null);
  const [depositPaid, setDepositPaid]   = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Withdraw state
  const [bolt11, setBolt11] = useState("");

  // Swap state
  const [swapDir, setSwapDir]     = useState<"to_nxt" | "to_sats">("to_nxt");
  const [swapSats, setSwapSats]   = useState("1000");
  const [swapNxt, setSwapNxt]     = useState("1");

  const { data: status } = useQuery({
    queryKey: ["/api/lightning/status"],
    refetchInterval: 30_000,
  });

  const { data: balance, refetch: refetchBal } = useQuery({
    queryKey: ["/api/lightning/balance"],
    refetchInterval: 15_000,
  });

  const { data: history } = useQuery({
    queryKey: ["/api/lightning/transactions"],
    enabled: tab === "history",
    refetchInterval: 10_000,
  });

  // Poll invoice status
  useEffect(() => {
    if (!invoice || depositPaid) return;
    const check = async () => {
      try {
        const r = await fetch(`/api/lightning/invoice/${invoice.paymentHash}`, { credentials: "include" });
        const d = await r.json();
        if (d.paid) {
          setDepositPaid(true);
          setInvoice(null);
          refetchBal();
          qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
          toast({ title: "Payment received!", description: `${d.amountSats} sats credited to your wallet.` });
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };
    pollRef.current = setInterval(check, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [invoice, depositPaid]);

  const createInvoice = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lightning/invoice", {
      amountSats: parseInt(depositSats),
      memo: depositMemo,
    }),
    onSuccess: (data: any) => {
      setInvoice(data);
      setDepositPaid(false);
      toast({ title: "Invoice created", description: "Scan the QR or copy the bolt11 to pay." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const payInvoice = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lightning/pay", { bolt11 }),
    onSuccess: (data: any) => {
      setBolt11("");
      refetchBal();
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      toast({ title: "Payment sent!", description: `${data.amountSats} sats withdrawn.` });
    },
    onError: (e: any) => toast({ title: "Payment failed", description: e.message, variant: "destructive" }),
  });

  const swapToNxt = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lightning/swap/to-nxt", { amountSats: parseInt(swapSats) }),
    onSuccess: (data: any) => {
      refetchBal();
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      toast({ title: "Swap complete!", description: `${data.amountSats} sats → ${data.nxtAmount} NXT` });
    },
    onError: (e: any) => toast({ title: "Swap failed", description: e.message, variant: "destructive" }),
  });

  const swapToSats = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lightning/swap/to-sats", { nxtAmount: parseFloat(swapNxt) }),
    onSuccess: (data: any) => {
      refetchBal();
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      toast({ title: "Swap complete!", description: `${data.nxtAmount} NXT → ${data.amountSats} sats` });
    },
    onError: (e: any) => toast({ title: "Swap failed", description: e.message, variant: "destructive" }),
  });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const configured = status?.configured;
  const sats = balance?.satsBalance ?? 0;
  const qrUrl = invoice
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoice.paymentRequest.toUpperCase())}&size=220x220&margin=8&color=ffffff&bgcolor=000000`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-yellow-950/10 to-slate-950 p-4 md:p-8" data-testid="page-lightning-wallet">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Lightning Wallet</h1>
          </div>
          <div className="flex-1" />
          {configured === false && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              <AlertTriangle className="w-3 h-3 mr-1" />Not configured
            </Badge>
          )}
          {configured === true && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Zap className="w-3 h-3 mr-1" />LNbits connected
            </Badge>
          )}
        </div>

        {/* Not configured warning */}
        {configured === false && (
          <Card className="bg-amber-900/20 border-amber-500/30 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-amber-400 font-semibold mb-1">LNbits not configured</div>
                <p className="text-amber-200/70 text-sm">Add these secrets in Replit Secrets to enable Lightning payments:</p>
                <ul className="mt-2 space-y-1 font-mono text-xs text-amber-300">
                  <li><span className="text-yellow-400">LNBITS_URL</span> — your LNbits instance URL (e.g. https://lnbits.yourdomain.com)</li>
                  <li><span className="text-yellow-400">LNBITS_ADMIN_KEY</span> — admin API key from LNbits wallet settings</li>
                  <li><span className="text-yellow-400">LNBITS_INVOICE_KEY</span> — invoice/read key from LNbits wallet settings</li>
                </ul>
                <p className="text-amber-200/50 text-xs mt-2">Self-host LNbits: <a href="https://github.com/lnbits/lnbits" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300">github.com/lnbits/lnbits</a></p>
              </div>
            </div>
          </Card>
        )}

        {/* Balance card */}
        <Card className="bg-gradient-to-br from-yellow-900/20 to-slate-900/60 border-yellow-500/20 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-yellow-400/60 text-xs uppercase tracking-wider mb-1">Sats Balance</div>
              <div className="text-4xl font-bold font-mono text-yellow-300" data-testid="text-sats-balance">
                ⚡ {satsDisplay(sats)} <span className="text-xl text-yellow-400/60">sats</span>
              </div>
              <div className="text-yellow-400/50 text-sm mt-1 font-mono">
                ≈ {balance?.nxtEquivalent ?? "0.00000000"} NXT · ≈ {(sats / 100_000_000).toFixed(8)} BTC
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={() => refetchBal()} className="text-yellow-400/40 hover:text-yellow-400 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="text-xs text-yellow-400/40 font-mono">1 NXT = 1,000 sats</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-black/20 rounded p-2">
              <div className="text-green-400/60 mb-0.5">Total deposited</div>
              <div className="text-green-300">⚡ {satsDisplay(balance?.totalDeposited ?? 0)} sats</div>
            </div>
            <div className="bg-black/20 rounded p-2">
              <div className="text-red-400/60 mb-0.5">Total withdrawn</div>
              <div className="text-red-300">⚡ {satsDisplay(balance?.totalWithdrawn ?? 0)} sats</div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900/50 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`tab-${t}`}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold transition-all ${
                tab === t
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "deposit"  && <><ArrowDownToLine  className="w-3.5 h-3.5" />Deposit</>}
              {t === "withdraw" && <><ArrowUpFromLine  className="w-3.5 h-3.5" />Withdraw</>}
              {t === "swap"     && <><ArrowRightLeft   className="w-3.5 h-3.5" />Swap</>}
              {t === "history"  && <><Clock           className="w-3.5 h-3.5" />History</>}
            </button>
          ))}
        </div>

        {/* ── DEPOSIT ── */}
        {tab === "deposit" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-green-400" />
              Receive via Lightning
            </h2>

            {depositPaid && (
              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-green-400 font-semibold">Payment received!</div>
                <div className="text-green-300/60 text-sm">Your sats balance has been updated.</div>
                <Button className="mt-3 bg-green-600 hover:bg-green-700" onClick={() => { setDepositPaid(false); setInvoice(null); }}>
                  Create another invoice
                </Button>
              </div>
            )}

            {!depositPaid && !invoice && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Amount (sats)</Label>
                  <Input
                    type="number"
                    value={depositSats}
                    onChange={(e) => setDepositSats(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 font-mono"
                    placeholder="10000"
                    min="1"
                    data-testid="input-deposit-sats"
                  />
                  <div className="text-xs text-gray-500">≈ {(parseInt(depositSats || "0") / 1000).toFixed(3)} NXT equivalent</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Memo (optional)</Label>
                  <Input
                    value={depositMemo}
                    onChange={(e) => setDepositMemo(e.target.value)}
                    className="bg-slate-800/50 border-slate-700"
                    placeholder="What's this for?"
                    data-testid="input-deposit-memo"
                  />
                </div>
                <Button
                  onClick={() => createInvoice.mutate()}
                  disabled={createInvoice.isPending || !configured}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="button-create-invoice"
                >
                  {createInvoice.isPending ? "Creating..." : "Generate Invoice"}
                </Button>
              </div>
            )}

            {invoice && !depositPaid && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-green-400 text-sm mb-3 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Waiting for payment…
                  </div>
                  {qrUrl && (
                    <div className="inline-block bg-black rounded-xl p-3 border border-yellow-500/20 mb-3">
                      <img src={qrUrl} alt="Lightning invoice QR" width={220} height={220} className="rounded" data-testid="img-invoice-qr" />
                    </div>
                  )}
                  <div className="text-xs text-gray-400 font-mono break-all bg-black/40 rounded p-3 border border-slate-700 text-left">
                    {invoice.paymentRequest}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-700"
                      onClick={() => copy(invoice.paymentRequest)}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />Copy Invoice
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-700"
                      onClick={() => { setInvoice(null); setDepositPaid(false); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── WITHDRAW ── */}
        {tab === "withdraw" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-red-400" />
              Send via Lightning
            </h2>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Lightning Invoice (bolt11)</Label>
              <textarea
                value={bolt11}
                onChange={(e) => setBolt11(e.target.value)}
                className="w-full min-h-[100px] bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 font-mono text-xs text-white placeholder-gray-600 resize-none focus:outline-none focus:border-yellow-500/50"
                placeholder="lnbc..."
                data-testid="input-bolt11"
              />
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-gray-400 space-y-1">
              <div>Available: <span className="text-yellow-300 font-mono">⚡ {satsDisplay(sats)} sats</span></div>
              <div className="text-gray-500">The invoice amount will be deducted from your sats balance.</div>
            </div>
            <Button
              onClick={() => payInvoice.mutate()}
              disabled={payInvoice.isPending || !bolt11.trim() || !configured || sats === 0}
              className="w-full bg-red-600 hover:bg-red-700"
              data-testid="button-pay-invoice"
            >
              {payInvoice.isPending ? "Sending…" : "Pay Invoice"}
            </Button>
          </Card>
        )}

        {/* ── SWAP ── */}
        {tab === "swap" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-purple-400" />
              Swap sats ↔ NXT
            </h2>

            {/* Direction toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setSwapDir("to_nxt")}
                data-testid="button-swap-to-nxt"
                className={`flex-1 py-2 rounded text-sm font-semibold transition-all ${swapDir === "to_nxt" ? "bg-purple-600 text-white" : "bg-slate-800/50 text-gray-400 hover:text-white"}`}
              >
                ⚡ Sats → NXT
              </button>
              <button
                onClick={() => setSwapDir("to_sats")}
                data-testid="button-swap-to-sats"
                className={`flex-1 py-2 rounded text-sm font-semibold transition-all ${swapDir === "to_sats" ? "bg-purple-600 text-white" : "bg-slate-800/50 text-gray-400 hover:text-white"}`}
              >
                NXT → ⚡ Sats
              </button>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-gray-400 space-y-1">
              <div>Rate: <span className="text-purple-300 font-mono">1 NXT = 1,000 sats</span></div>
              <div>Sats balance: <span className="text-yellow-300 font-mono">⚡ {satsDisplay(sats)}</span></div>
            </div>

            {swapDir === "to_nxt" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Amount to swap (sats)</Label>
                  <Input
                    type="number"
                    value={swapSats}
                    onChange={(e) => setSwapSats(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 font-mono"
                    min="100"
                    data-testid="input-swap-sats"
                  />
                  <div className="text-xs text-purple-400">→ {(parseInt(swapSats || "0") / 1000).toFixed(3)} NXT</div>
                </div>
                <Button
                  onClick={() => swapToNxt.mutate()}
                  disabled={swapToNxt.isPending || parseInt(swapSats) < 100 || parseInt(swapSats) > sats}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  data-testid="button-execute-swap-to-nxt"
                >
                  {swapToNxt.isPending ? "Swapping…" : `Swap ${swapSats} sats → NXT`}
                </Button>
              </div>
            )}

            {swapDir === "to_sats" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">NXT amount to swap</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={swapNxt}
                    onChange={(e) => setSwapNxt(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 font-mono"
                    min="0.001"
                    data-testid="input-swap-nxt"
                  />
                  <div className="text-xs text-yellow-400">→ ⚡ {Math.floor(parseFloat(swapNxt || "0") * 1000).toLocaleString()} sats</div>
                </div>
                <Button
                  onClick={() => swapToSats.mutate()}
                  disabled={swapToSats.isPending || parseFloat(swapNxt) < 0.001}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  data-testid="button-execute-swap-to-sats"
                >
                  {swapToSats.isPending ? "Swapping…" : `Swap ${swapNxt} NXT → sats`}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6">
            <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-blue-400" />
              Transaction History
            </h2>
            {!history?.transactions?.length && (
              <div className="text-center text-gray-500 py-8">No transactions yet.</div>
            )}
            <div className="space-y-2">
              {history?.transactions?.map((tx: any) => (
                <div
                  key={tx.id}
                  data-testid={`row-tx-${tx.id}`}
                  className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-slate-800/60"
                >
                  <div className="shrink-0">
                    {tx.type === "deposit"      && <ArrowDownToLine  className="w-4 h-4 text-green-400" />}
                    {tx.type === "withdrawal"   && <ArrowUpFromLine  className="w-4 h-4 text-red-400" />}
                    {tx.type.startsWith("swap") && <ArrowRightLeft   className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">{typeLabel(tx.type)}</div>
                    <div className="text-xs text-gray-500 truncate">{tx.memo || tx.paymentHash?.slice(0, 24) + "…" || "—"}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-yellow-300">⚡ {satsDisplay(tx.amount_sats ?? tx.amountSats ?? 0)}</div>
                    <div className="mt-0.5"><StatusBadge status={tx.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Setup guide */}
        <Card className="bg-slate-900/40 border-slate-800/50 p-4 mt-6">
          <div className="flex items-start gap-3">
            <Bitcoin className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
            <div className="text-xs text-gray-500">
              <span className="text-gray-300 font-semibold">Self-hosted LNbits</span> — deploy on a VPS, Raspberry Pi, or cloud instance.
              Connect to your own LND/Core Lightning node or use a managed backend like{" "}
              <a href="https://voltage.cloud" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Voltage</a> or{" "}
              <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Alby</a> as the funding source.
              Docs: <a href="https://docs.lnbits.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">docs.lnbits.org</a>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
