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
  Bitcoin, Radio, Waves, Activity, ArrowDownLeft, ArrowUpRight,
  Atom, Send,
} from "lucide-react";

const TABS = ["receive", "transmit", "swap", "transmissions"] as const;
type Tab = typeof TABS[number];

function satsDisplay(sats: number) {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(4)}M`;
  if (sats >= 1_000)     return `${(sats / 1_000).toFixed(3)}K`;
  return String(sats);
}

function formatNxt(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (v >= 1e9) return (v / 1e9).toFixed(3) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(3) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(3) + "K";
  return v.toFixed(8);
}

function fmtTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed" || status === "confirmed")
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Transmitted</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

function nmToRgb(nm: number): string {
  if (nm < 450) return "#7c3aed";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#059669";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}

function ChannelPulse({ nm }: { nm: number }) {
  const color = nmToRgb(nm);
  return (
    <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
  );
}

export default function ChannelDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("receive");

  const [depositSats, setDepositSats] = useState("10000");
  const [depositMemo, setDepositMemo] = useState("");
  const [invoice, setInvoice]         = useState<{ paymentRequest: string; paymentHash: string; txId: number } | null>(null);
  const [depositPaid, setDepositPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [bolt11, setBolt11] = useState("");

  const [swapDir, setSwapDir]   = useState<"to_nxt" | "to_sats">("to_nxt");
  const [swapSats, setSwapSats] = useState("1000");
  const [swapNxt, setSwapNxt]   = useState("1");

  const { data: status } = useQuery({
    queryKey: ["/api/lightning/status"],
    refetchInterval: 30_000,
  });

  const { data: lnBalance, refetch: refetchBal } = useQuery({
    queryKey: ["/api/lightning/balance"],
    refetchInterval: 15_000,
  });

  const { data: nxtData } = useQuery({
    queryKey: ["/api/wallet"],
    refetchInterval: 15_000,
  });

  const { data: spectral } = useQuery({
    queryKey: ["/api/spectral/my-canonical"],
    refetchInterval: 60_000,
  });

  const { data: lnHistory } = useQuery({
    queryKey: ["/api/lightning/transactions"],
    enabled: tab === "transmissions",
    refetchInterval: 10_000,
  });

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
          toast({ title: "⚡ Signal received!", description: `${d.amountSats} sats credited to your channel.` });
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };
    pollRef.current = setInterval(check, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [invoice, depositPaid]);

  const createInvoice = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lightning/invoice", { amountSats: parseInt(depositSats), memo: depositMemo }),
    onSuccess: (data: any) => { setInvoice(data); setDepositPaid(false); toast({ title: "Channel open", description: "Invoice ready — awaiting incoming transmission." }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const payInvoice = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lightning/pay", { bolt11 }),
    onSuccess: (data: any) => {
      setBolt11("");
      refetchBal();
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      toast({ title: "⚡ Transmission sent", description: `${data.amountSats} sats transmitted.` });
    },
    onError: (e: any) => toast({ title: "Transmission failed", description: e.message, variant: "destructive" }),
  });

  const swapToNxt = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lightning/swap/to-nxt", { amountSats: parseInt(swapSats) }),
    onSuccess: (data: any) => { refetchBal(); qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] }); toast({ title: "Channel swap complete", description: `${data.amountSats} sats → ${data.nxtAmount} NXT` }); },
    onError: (e: any) => toast({ title: "Swap failed", description: e.message, variant: "destructive" }),
  });

  const swapToSats = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lightning/swap/to-sats", { nxtAmount: parseFloat(swapNxt) }),
    onSuccess: (data: any) => { refetchBal(); qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] }); toast({ title: "Channel swap complete", description: `${data.nxtAmount} NXT → ${data.amountSats} sats` }); },
    onError: (e: any) => toast({ title: "Swap failed", description: e.message, variant: "destructive" }),
  });

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied to clipboard" }); };

  const configured       = status?.configured;
  const provider         = status?.provider ?? "—";
  const lightningAddress = status?.lightningAddress as string | undefined;
  const sats             = lnBalance?.satsBalance ?? 0;
  const nxtBalance = nxtData?.wallet ? parseFloat(nxtData.wallet.balance) : 0;
  const nxtAddress = nxtData?.wallet?.address ?? "";
  const nxtLocked  = nxtData?.wallet ? parseFloat(nxtData.wallet.lockedBalance) : 0;

  const psi      = spectral?.spectral?.psi ?? "Ψ(—)";
  const wnspUri  = spectral?.spectral?.uri ?? "wnsp://—";
  const nm       = spectral?.spectral?.nm ?? 550;
  const band     = spectral?.spectral?.band ?? "—";
  const freqTHz  = spectral?.spectral?.freqTHz ?? 0;
  const chanColor = nmToRgb(nm);

  const qrUrl = invoice
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoice.paymentRequest.toUpperCase())}&size=220x220&margin=8&color=ffffff&bgcolor=000000`
    : null;

  const nxtTxs  = (nxtData?.recentTransactions ?? []) as any[];
  const lnTxs   = (lnHistory?.transactions ?? []) as any[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8" data-testid="page-channel-dashboard">
      <div className="max-w-2xl mx-auto">

        {/* ── Back nav ── */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <span className="text-gray-400 text-sm font-mono">Channel Dashboard</span>
          </div>
          <div className="flex-1" />
          {configured === false && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />No provider
            </Badge>
          )}
          {configured === true && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <Zap className="w-3 h-3 mr-1" />{provider}
            </Badge>
          )}
        </div>

        {/* ── Identity hero card ── */}
        <Card
          className="p-6 mb-5 border relative overflow-hidden"
          style={{ borderColor: chanColor + "44", background: `linear-gradient(135deg, ${chanColor}08 0%, #0f172a 100%)` }}
        >
          {/* Animated ring */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="w-20 h-20 rounded-full border-2 animate-pulse" style={{ borderColor: chanColor }} />
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 shrink-0"
              style={{ borderColor: chanColor + "88", background: chanColor + "18" }}>
              <Waves className="w-6 h-6" style={{ color: chanColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ChannelPulse nm={nm} />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{band} band · {nm.toFixed(1)} nm · {freqTHz.toFixed(2)} THz</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-1" data-testid="text-psi-address">{psi}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono truncate" style={{ color: chanColor + "cc" }}>{wnspUri}</span>
                <button onClick={() => copy(wnspUri)} className="text-gray-600 hover:text-gray-300 shrink-0">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              {nxtAddress && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono text-gray-600">{nxtAddress}</span>
                  <button onClick={() => copy(nxtAddress)} className="text-gray-700 hover:text-gray-400">
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Unified balance row ── */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* NXT */}
          <Card className="bg-gradient-to-br from-amber-900/20 to-slate-900/60 border-amber-500/20 p-4">
            <div className="text-amber-400/60 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Atom className="w-3 h-3" /> NXT Channel Balance
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300" data-testid="text-nxt-balance">
              {formatNxt(nxtBalance)}
            </div>
            <div className="text-amber-400/40 text-[10px] font-mono mt-0.5">NXT</div>
            {nxtLocked > 0 && (
              <div className="text-[10px] font-mono text-gray-500 mt-1">🔒 {formatNxt(nxtLocked)} locked</div>
            )}
          </Card>

          {/* ⚡ sats */}
          <Card className="bg-gradient-to-br from-yellow-900/20 to-slate-900/60 border-yellow-500/20 p-4">
            <div className="text-yellow-400/60 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Lightning Balance
            </div>
            <div className="text-2xl font-bold font-mono text-yellow-300" data-testid="text-sats-balance">
              {satsDisplay(sats)}
            </div>
            <div className="text-yellow-400/40 text-[10px] font-mono mt-0.5">sats · ≈ {lnBalance?.nxtEquivalent ?? "0"} NXT</div>
            {lightningAddress && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-mono text-yellow-400/50 truncate">{lightningAddress}</span>
                <button onClick={() => copy(lightningAddress)} className="text-yellow-400/30 hover:text-yellow-400 shrink-0">
                  <Copy className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div className="text-[10px] font-mono text-gray-600">↓ {satsDisplay(lnBalance?.totalDeposited ?? 0)}</div>
              <div className="text-[10px] font-mono text-gray-600">↑ {satsDisplay(lnBalance?.totalWithdrawn ?? 0)}</div>
              <button onClick={() => refetchBal()} className="ml-auto text-yellow-400/30 hover:text-yellow-400 transition-colors">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </Card>
        </div>

        {/* ── Not configured warning ── */}
        {configured === false && (
          <Card className="bg-amber-900/20 border-amber-500/30 p-4 mb-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="w-full">
                <div className="text-amber-400 font-semibold mb-2">Connect a Lightning provider to activate your channel</div>

                {/* Option A — Coinos (recommended) */}
                <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-3 mb-2">
                  <div className="text-green-300 font-semibold text-sm mb-1">✅ Option A — Coinos (free, works now)</div>
                  <ol className="text-green-200/70 text-xs space-y-1 list-decimal list-inside mb-2">
                    <li>Go to <a href="https://coinos.io" target="_blank" rel="noopener noreferrer" className="text-green-400 underline">coinos.io</a> → Register free</li>
                    <li>Top-right menu → <strong>Settings → API Token</strong> → copy it</li>
                    <li>Add to Replit Secrets:</li>
                  </ol>
                  <div className="font-mono text-xs bg-black/30 rounded p-2 text-green-300">COINOS_TOKEN = &lt;your token&gt;</div>
                </div>

                {/* Option B — LNbits */}
                <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-3">
                  <div className="text-gray-400 font-semibold text-xs mb-1">Option B — Self-hosted LNbits</div>
                  <div className="font-mono text-xs bg-black/30 rounded p-2 text-gray-500 space-y-0.5">
                    <div>LNBITS_URL · LNBITS_ADMIN_KEY · LNBITS_INVOICE_KEY</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 bg-slate-900/50 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`tab-${t}`}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs font-semibold transition-all capitalize ${
                tab === t
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "receive"        && <><ArrowDownToLine className="w-3.5 h-3.5" />Receive</>}
              {t === "transmit"       && <><Send            className="w-3.5 h-3.5" />Transmit</>}
              {t === "swap"           && <><ArrowRightLeft  className="w-3.5 h-3.5" />Swap</>}
              {t === "transmissions"  && <><Activity        className="w-3.5 h-3.5" />Log</>}
            </button>
          ))}
        </div>

        {/* ── RECEIVE ── */}
        {tab === "receive" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-green-400" />
              Receive via Lightning channel
            </h2>

            {depositPaid && (
              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-green-400 font-semibold">⚡ Signal received!</div>
                <div className="text-green-300/60 text-sm">Your channel balance has been updated.</div>
                <Button className="mt-3 bg-green-600 hover:bg-green-700" onClick={() => { setDepositPaid(false); setInvoice(null); }}>
                  Open another channel
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
                    placeholder="Channel memo…"
                    data-testid="input-deposit-memo"
                  />
                </div>
                <Button
                  onClick={() => createInvoice.mutate()}
                  disabled={createInvoice.isPending || !configured}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="button-create-invoice"
                >
                  {createInvoice.isPending ? "Opening channel…" : "Generate Lightning Invoice"}
                </Button>
              </div>
            )}

            {invoice && !depositPaid && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-green-400 text-sm mb-3 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Channel open — awaiting transmission…
                  </div>
                  {qrUrl && (
                    <div className="inline-block bg-black rounded-xl p-3 border border-cyan-500/20 mb-3">
                      <img src={qrUrl} alt="Lightning invoice QR" width={220} height={220} className="rounded" data-testid="img-invoice-qr" />
                    </div>
                  )}
                  <div className="text-xs text-gray-400 font-mono break-all bg-black/40 rounded p-3 border border-slate-700 text-left">
                    {invoice.paymentRequest}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 border-slate-700" onClick={() => copy(invoice.paymentRequest)}>
                      <Copy className="w-3.5 h-3.5 mr-1" />Copy Invoice
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-slate-700" onClick={() => { setInvoice(null); setDepositPaid(false); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── TRANSMIT ── */}
        {tab === "transmit" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Send className="w-4 h-4 text-red-400" />
              Transmit via Lightning channel
            </h2>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Lightning Invoice (bolt11)</Label>
              <textarea
                value={bolt11}
                onChange={(e) => setBolt11(e.target.value)}
                className="w-full min-h-[100px] bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 font-mono text-xs text-white placeholder-gray-600 resize-none focus:outline-none focus:border-cyan-500/50"
                placeholder="lnbc…"
                data-testid="input-bolt11"
              />
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-gray-400 space-y-1">
              <div>Channel balance: <span className="text-yellow-300 font-mono">⚡ {satsDisplay(sats)} sats</span></div>
              <div className="text-gray-500">The invoice amount will be deducted from your Lightning channel balance.</div>
            </div>
            <Button
              onClick={() => payInvoice.mutate()}
              disabled={payInvoice.isPending || !bolt11.trim() || !configured || sats === 0}
              className="w-full bg-red-600 hover:bg-red-700"
              data-testid="button-pay-invoice"
            >
              {payInvoice.isPending ? "Transmitting…" : "Send Transmission"}
            </Button>
          </Card>
        )}

        {/* ── SWAP ── */}
        {tab === "swap" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-purple-400" />
              Channel conversion — sats ↔ NXT
            </h2>

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
              <div>Conversion rate: <span className="text-purple-300 font-mono">1 NXT = 1,000 sats</span></div>
              <div>⚡ Channel: <span className="text-yellow-300 font-mono">{satsDisplay(sats)} sats</span>
                · NXT: <span className="text-amber-300 font-mono">{formatNxt(nxtBalance)} NXT</span></div>
            </div>

            {swapDir === "to_nxt" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Sats to convert</Label>
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
                  {swapToNxt.isPending ? "Converting…" : `Convert ${swapSats} sats → NXT`}
                </Button>
              </div>
            )}

            {swapDir === "to_sats" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">NXT to convert</Label>
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
                  {swapToSats.isPending ? "Converting…" : `Convert ${swapNxt} NXT → sats`}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* ── TRANSMISSIONS LOG ── */}
        {tab === "transmissions" && (
          <div className="space-y-3">
            {/* Lightning transmissions */}
            {lnTxs.length > 0 && (
              <Card className="bg-slate-900/60 border-slate-700/50 p-4">
                <div className="text-xs font-semibold text-yellow-400/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Lightning Channel Transmissions
                </div>
                <div className="space-y-2">
                  {lnTxs.map((tx: any) => (
                    <div
                      key={tx.id}
                      data-testid={`row-ln-tx-${tx.id}`}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-slate-800/60"
                    >
                      <div className="shrink-0">
                        {tx.type === "deposit"      && <ArrowDownToLine className="w-4 h-4 text-green-400" />}
                        {tx.type === "withdrawal"   && <ArrowUpFromLine className="w-4 h-4 text-red-400" />}
                        {tx.type?.startsWith("swap") && <ArrowRightLeft className="w-4 h-4 text-purple-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium">
                          {tx.type === "deposit"      && "⚡ Inbound"}
                          {tx.type === "withdrawal"   && "⚡ Outbound"}
                          {tx.type === "swap_to_nxt"  && "⇄ → NXT"}
                          {tx.type === "swap_to_sats" && "⇄ → Sats"}
                          {!["deposit","withdrawal","swap_to_nxt","swap_to_sats"].includes(tx.type) && tx.type}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{tx.memo || tx.paymentHash?.slice(0, 20) + "…" || "—"}</div>
                        {tx.createdAt && <div className="text-[10px] text-gray-600 mt-0.5">{fmtTime(tx.createdAt)}</div>}
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

            {/* NXT channel transmissions */}
            {nxtTxs.length > 0 && (
              <Card className="bg-slate-900/60 border-slate-700/50 p-4">
                <div className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Atom className="w-3.5 h-3.5" /> NXT Spectral Transmissions
                </div>
                <div className="space-y-2">
                  {nxtTxs.slice(0, 10).map((tx: any) => {
                    const nm2    = tx.wavelength ? parseFloat(tx.wavelength) : 550;
                    const color2 = nmToRgb(nm2);
                    const earnSet = new Set(["message_earning","stream_earning","document_earning"]);
                    const burnSet = new Set(["protocol_burn"]);
                    const isBurn = burnSet.has(tx.type);
                    const isIn   = earnSet.has(tx.type) || (!isBurn && tx.toWalletId && tx.toWalletId === nxtData?.wallet?.id);
                    const TX_LABELS: Record<string,string> = {
                      transfer: "Transfer", message_fee: "Msg Fee", message_earning: "Msg Earned",
                      stream_fee: "Stream Fee", stream_earning: "Stream Earned",
                      document_fee: "Doc Fee", document_earning: "Doc Earned",
                      upload_fee: "Upload Fee", protocol_burn: "Protocol Burn",
                    };
                    const label = TX_LABELS[tx.type] ?? tx.type.replace(/_/g," ");
                    return (
                      <div
                        key={tx.id}
                        data-testid={`row-nxt-tx-${tx.id}`}
                        className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-slate-800/60"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isBurn ? "bg-orange-500/15 text-orange-400" :
                          isIn   ? "bg-green-500/15 text-green-400"  : "bg-red-500/15 text-red-400"
                        }`}>
                          {isBurn ? "🔥" : isIn
                            ? <ArrowDownLeft className="w-3.5 h-3.5" />
                            : <ArrowUpRight  className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-white">{label}</span>
                            {tx.wavelength && <ChannelPulse nm={nm2} />}
                            {tx.wavelength && <span className="text-[9px] font-mono" style={{ color: color2 }}>{nm2.toFixed(0)}nm</span>}
                          </div>
                          <div className="text-[10px] text-gray-600">{fmtTime(tx.createdAt)}</div>
                        </div>
                        <div className={`font-mono text-sm font-bold shrink-0 ${isBurn ? "text-orange-400" : isIn ? "text-green-400" : "text-red-400"}`}>
                          {isBurn ? "🔥 " : isIn ? "+" : "−"}{formatNxt(tx.amount)} NXT
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {lnTxs.length === 0 && nxtTxs.length === 0 && (
              <Card className="bg-slate-900/60 border-slate-700/50 p-8 text-center">
                <Activity className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <div className="text-gray-500">No transmissions yet.<br />Your channel activity will appear here.</div>
              </Card>
            )}
          </div>
        )}

        {/* ── Channel info footer ── */}
        <div className="mt-6 flex items-center gap-3 text-[10px] text-gray-600 font-mono">
          <Bitcoin className="w-3.5 h-3.5 text-orange-400/50" />
          <span>Lightning · 1 NXT = 1,000 sats · WNSP E=hf · Λ=hf/c²</span>
          <span className="ml-auto">{psi}</span>
        </div>

      </div>
    </div>
  );
}
