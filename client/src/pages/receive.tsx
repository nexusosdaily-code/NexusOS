import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowLeft, Copy, CheckCircle, Zap, Bitcoin, Coins,
  RefreshCw, ExternalLink, QrCode, AlertCircle,
} from "lucide-react";

function QRImage({ value, size = 180 }: { value: string; size?: number }) {
  if (!value) return <div className="w-[180px] h-[180px] bg-slate-800 rounded-xl flex items-center justify-center"><QrCode className="w-8 h-8 text-slate-600" /></div>;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=0f1117&color=c4b5fd&margin=10`;
  return (
    <img
      src={url}
      alt="QR code"
      width={size}
      height={size}
      className="rounded-xl border border-slate-700/50"
      data-testid="qr-code"
    />
  );
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 transition-colors text-slate-300"
      data-testid="btn-copy"
    >
      {copied
        ? <><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Copied!</>
        : <><Copy className="w-3.5 h-3.5" /> {label ?? "Copy"}</>
      }
    </button>
  );
}

type Tab = "lightning" | "btc" | "nxt";

export default function ReceivePage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("lightning");
  const [amount, setAmount] = useState("50000");
  const [invoice, setInvoice] = useState<{ paymentRequest: string; txId: number; amountSats: number } | null>(null);
  const [paid, setPaid] = useState(false);

  const { data: btcInfo } = useQuery<{ depositAddress: string; satsPerNxt: number; minDepositSats: number }>({
    queryKey: ["/api/btc/deposit/info"],
    queryFn: () => fetch("/api/btc/deposit/info").then(r => r.json()),
  });

  const { data: wallet } = useQuery<{ address: string; balance: string }>({
    queryKey: ["/api/wallet"],
    queryFn: () => fetch("/api/wallet", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
  });

  const invoiceMutation = useMutation({
    mutationFn: async (sats: number) => {
      const r = await fetch("/api/lightning/invoice", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ amountSats: sats, memo: "NexusOS receive" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Invoice creation failed");
      return j;
    },
    onSuccess: (data) => {
      setInvoice(data);
      setPaid(false);
    },
    onError: (e: any) => toast({ title: "Invoice error", description: e.message, variant: "destructive" }),
  });

  // Poll for Lightning payment
  useEffect(() => {
    if (!invoice || paid) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/lightning/invoice/check?txId=${invoice.txId}`, {
          credentials: "include", headers: getAuthHeaders(),
        });
        const d = await r.json();
        if (d.status === "paid" || d.status === "settled") {
          setPaid(true);
          clearInterval(t);
          toast({ title: "⚡ Payment received!", description: `${invoice.amountSats.toLocaleString()} sats deposited` });
        }
      } catch { /* ignore */ }
    }, 5_000);
    return () => clearInterval(t);
  }, [invoice, paid]);

  const TABS: { id: Tab; label: string; icon: typeof Zap; color: string }[] = [
    { id: "lightning", label: "Lightning", icon: Zap,     color: "yellow" },
    { id: "btc",       label: "Bitcoin",   icon: Bitcoin, color: "orange" },
    { id: "nxt",       label: "NXT",       icon: Coins,   color: "purple" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <h1 className="sr-only">Receive — Lightning Wallet</h1>
        <div className="flex items-center justify-between mb-6">
          <Link href="/lightning-wallet">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Wallet
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <QrCode className="w-4 h-4" /> Receive
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? t.color === "yellow" ? "bg-yellow-500/20 text-yellow-300"
                  : t.color === "orange" ? "bg-orange-500/20 text-orange-300"
                  : "bg-purple-500/20 text-purple-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              data-testid={`tab-${t.id}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Lightning ── */}
        {tab === "lightning" && (
          <div className="space-y-4">
            <Card className="bg-slate-900/70 border-yellow-500/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Lightning Invoice</h2>
              </div>

              <div className="flex gap-2 mb-4">
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Amount in sats"
                  className="bg-slate-800 border-slate-700 text-white font-mono flex-1"
                  data-testid="input-amount"
                />
                <Button
                  onClick={() => invoiceMutation.mutate(parseInt(amount))}
                  disabled={invoiceMutation.isPending || !amount || parseInt(amount) < 1}
                  className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"
                  data-testid="button-generate"
                >
                  {invoiceMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Generate"}
                </Button>
              </div>

              {/* Quick amount buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[10_000, 50_000, 100_000, 500_000, 1_000_000].map(s => (
                  <button
                    key={s}
                    onClick={() => setAmount(String(s))}
                    className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                      amount === String(s)
                        ? "bg-yellow-500/30 text-yellow-300 border border-yellow-500/40"
                        : "bg-slate-700/50 text-slate-400 hover:text-slate-200"
                    }`}
                    data-testid={`quick-amount-${s}`}
                  >
                    {s >= 1_000_000 ? `${s/1_000_000}M` : s >= 1_000 ? `${s/1_000}k` : s}
                  </button>
                ))}
              </div>

              {invoice ? (
                paid ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <div className="text-green-400 font-bold text-lg">Payment received!</div>
                    <div className="text-slate-400 text-sm">{invoice.amountSats.toLocaleString()} sats deposited</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <QRImage value={invoice.paymentRequest} size={200} />
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">BOLT11 Invoice</div>
                      <div className="font-mono text-[10px] text-yellow-200/70 break-all leading-relaxed">{invoice.paymentRequest}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <CopyBtn text={invoice.paymentRequest} label="Copy Invoice" />
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Waiting for payment…
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-slate-600 text-sm">
                  Set an amount and tap Generate to create a Lightning invoice.
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Bitcoin on-chain ── */}
        {tab === "btc" && (
          <Card className="bg-slate-900/70 border-orange-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bitcoin className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-bold text-orange-400 uppercase tracking-widest">Bitcoin On-chain</h2>
            </div>

            {btcInfo ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <QRImage value={`bitcoin:${btcInfo.depositAddress}`} size={200} />
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Deposit Address</div>
                  <div className="font-mono text-xs text-orange-200/80 break-all">{btcInfo.depositAddress}</div>
                </div>
                <div className="flex gap-2">
                  <CopyBtn text={btcInfo.depositAddress} label="Copy Address" />
                  <a
                    href={`https://mempool.space/address/${btcInfo.depositAddress}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 transition-colors text-slate-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Mempool
                  </a>
                </div>
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-300/80 leading-relaxed">
                      Sends are auto-detected. Min deposit {btcInfo.minDepositSats.toLocaleString()} sats.
                      Rate: <span className="font-mono font-bold">{btcInfo.satsPerNxt.toLocaleString()} sats = 1 NXT</span>.
                      Ordinals and Rune UTXOs are tracked separately by the Asset Sentinel.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm text-center py-8">Loading…</div>
            )}
          </Card>
        )}

        {/* ── NXT wallet ── */}
        {tab === "nxt" && (
          <Card className="bg-slate-900/70 border-purple-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-purple-400 uppercase tracking-widest">NXT Wallet Address</h2>
            </div>

            {wallet ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <QRImage value={wallet.address} size={200} />
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">NXT Address</div>
                  <div className="font-mono text-xs text-purple-200/80 break-all">{wallet.address}</div>
                </div>
                <div className="flex gap-2">
                  <CopyBtn text={wallet.address} label="Copy Address" />
                </div>
                <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-3 text-[11px] text-purple-300/70">
                  NXT transfers are instant and physics-validated. Current balance: <span className="font-bold text-purple-200">{parseFloat(wallet.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} NXT</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm text-center py-8">Log in to view your NXT address.</div>
            )}
          </Card>
        )}

        {/* Footer links */}
        <div className="flex justify-center gap-6 mt-6 text-[11px] text-slate-600">
          <Link href="/lightning-wallet" className="hover:text-slate-400 transition-colors">Wallet</Link>
          <Link href="/portfolio" className="hover:text-slate-400 transition-colors">Portfolio</Link>
          <Link href="/lp-pools" className="hover:text-slate-400 transition-colors">Liquidity</Link>
        </div>
      </div>
    </div>
  );
}
