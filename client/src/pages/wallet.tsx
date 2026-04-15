import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Wallet, Send, ArrowDownLeft, ArrowUpRight, ArrowLeft, Copy, CheckCircle,
  Clock, Zap, RefreshCw, Shield, Coins, History, Atom, AlertCircle
} from "lucide-react";

// ── Physics helpers ────────────────────────────────────────────────────────────
const H  = 6.626e-34;
const C  = 2.998e8;

function nmToRgb(nm: number): string {
  if (nm < 450) return "#7c3aed";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#059669";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}

function feeFromAmount(nxt: number): { feeNxt: number; wavelengthNm: number; freqTHz: number; energyJ: number; lambdaKg: number } {
  const wavelengthNm = 380 + ((nxt % 1000) / 1000) * 400;
  const freq = C / (wavelengthNm * 1e-9);
  const energyJ = H * freq;
  const lambdaKg = energyJ / (C * C);
  const feeNxt = nxt * 0.001;
  return { feeNxt, wavelengthNm, freqTHz: freq / 1e12, energyJ, lambdaKg };
}

function formatNxt(raw: string | number): string {
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (n >= 1e9) return (n / 1e9).toFixed(3) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(3) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(3) + "K";
  return n.toFixed(8);
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

// ── API types ─────────────────────────────────────────────────────────────────
interface WalletData {
  wallet: { address: string; balance: string; lockedBalance: string };
  recentTransactions: Array<{
    id: string; type: string; amount: string; fee: string;
    wavelength: string | null; frequency: string | null; energyCost: string | null;
    status: string; createdAt: string;
    fromWalletId: string | null; toWalletId: string | null;
    metadata: Record<string, unknown> | null;
  }>;
}

// ── CopyButton ─────────────────────────────────────────────────────────────────
function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`p-1 rounded opacity-60 hover:opacity-100 transition-opacity ${className}`}
      data-testid="btn-copy-address"
    >
      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

// ── Physics fee preview ────────────────────────────────────────────────────────
function FeePreview({ amount }: { amount: string }) {
  const nxt = parseFloat(amount);
  if (!amount || isNaN(nxt) || nxt <= 0) return null;
  const { feeNxt, wavelengthNm, freqTHz, energyJ, lambdaKg } = feeFromAmount(nxt);
  const color = nmToRgb(wavelengthNm);

  return (
    <div className="rounded-xl border p-4 space-y-3 transition-all"
      style={{ borderColor: color + "44", background: color + "08" }}>
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color }}>
        <Atom className="w-4 h-4" /> Transaction Physics — E=hf · Λ=hf/c²
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900/60 rounded-lg p-2">
          <div className="text-slate-500 mb-0.5">Wavelength</div>
          <div className="font-mono font-bold" style={{ color }}>{wavelengthNm.toFixed(2)} nm</div>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-2">
          <div className="text-slate-500 mb-0.5">Frequency</div>
          <div className="font-mono font-bold text-cyan-400">{freqTHz.toFixed(3)} THz</div>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-2">
          <div className="text-slate-500 mb-0.5">Photon energy</div>
          <div className="font-mono font-bold text-purple-400">{energyJ.toExponential(3)} J</div>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-2">
          <div className="text-slate-500 mb-0.5">Λ mass-equiv.</div>
          <div className="font-mono font-bold text-amber-400">{lambdaKg.toExponential(3)} kg</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700">
        <span className="text-slate-400">Network fee (0.1%)</span>
        <span className="font-mono font-bold text-amber-400">{feeNxt.toFixed(8)} NXT</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Total deducted</span>
        <span className="font-mono font-bold text-white">{(nxt + feeNxt).toFixed(8)} NXT</span>
      </div>
    </div>
  );
}

// ── Transaction row ────────────────────────────────────────────────────────────
const TX_LABELS: Record<string, string> = {
  transfer:         "Transfer",
  message_fee:      "Message Fee",
  message_earning:  "Message Earned",
  stream_fee:       "Stream Fee",
  stream_earning:   "Stream Earned",
  document_fee:     "Document Fee",
  document_earning: "Document Earned",
  upload_fee:       "Upload Fee",
  protocol_burn:    "Protocol Burn",
};

const EARNING_TYPES = new Set(["message_earning", "stream_earning", "document_earning"]);
const BURN_TYPES    = new Set(["protocol_burn"]);

function TxRow({ tx, walletId }: { tx: WalletData["recentTransactions"][0]; walletId: string }) {
  const isEarning  = EARNING_TYPES.has(tx.type);
  const isBurn     = BURN_TYPES.has(tx.type);
  const isIncoming = isEarning || (tx.toWalletId === walletId && !isBurn);
  const dir        = isIncoming ? "receive" : "send";

  const nm    = tx.wavelength ? parseFloat(tx.wavelength) : 550;
  const color = nmToRgb(nm);
  const label = TX_LABELS[tx.type] ?? tx.type.replace(/_/g, " ");
  const meta  = tx.metadata as Record<string, any> | null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 hover:border-slate-700 transition-colors"
      data-testid={`tx-row-${tx.id}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        isBurn  ? "bg-orange-500/15 text-orange-400" :
        dir === "receive" ? "bg-green-500/15 text-green-400"
                          : "bg-red-500/15 text-red-400"
      }`}>
        {isBurn ? "🔥" : dir === "receive"
          ? <ArrowDownLeft className="w-4 h-4" />
          : <ArrowUpRight className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-medium">{label}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${tx.status === "confirmed" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
            {tx.status}
          </span>
          {meta?.band && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{meta.band}</span>
          )}
        </div>
        {tx.wavelength && (
          <div className="flex items-center gap-2 text-[10px] mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span style={{ color }} className="font-mono">{nm.toFixed(1)} nm</span>
            {tx.energyCost && <span className="text-slate-600">· Λ={parseFloat(tx.energyCost).toExponential(2)} J</span>}
          </div>
        )}
        {meta?.memo && (
          <div className="text-[10px] text-slate-600 font-mono truncate mt-0.5">{meta.memo}</div>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <div className={`font-mono font-bold text-sm ${
          isBurn ? "text-orange-400" :
          dir === "receive" ? "text-green-400" : "text-red-400"
        }`}>
          {isBurn ? "🔥 " : dir === "receive" ? "+" : "−"}{formatNxt(tx.amount)} NXT
        </div>
        <div className="text-[10px] text-slate-600 flex items-center justify-end gap-1 mt-0.5">
          <Clock className="w-3 h-3" /> {fmtTime(tx.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ── Stats panel ────────────────────────────────────────────────────────────────
function StatsPanel({ txs }: { txs: WalletData["recentTransactions"]; }) {
  const earningSet = new Set(["message_earning", "stream_earning", "document_earning"]);
  const feeSet     = new Set(["message_fee", "stream_fee", "document_fee", "upload_fee", "protocol_burn"]);
  const sends      = txs.filter(t => t.type === "transfer" || feeSet.has(t.type));
  const receives   = txs.filter(t => earningSet.has(t.type) || (t.type === "transfer" && t.toWalletId));
  const earnings   = txs.filter(t => earningSet.has(t.type));
  const totalSent  = sends.reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalRcvd  = receives.reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalEarned = earnings.reduce((s, t) => s + parseFloat(t.amount), 0);
  const avgWl = txs.filter(t => t.wavelength).reduce((s, t) => s + parseFloat(t.wavelength!), 0) / (txs.filter(t => t.wavelength).length || 1);
  const totalEnergy = txs.filter(t => t.energyCost).reduce((s, t) => s + parseFloat(t.energyCost!), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-slate-900/60 border-green-500/30 p-6" data-testid="card-tx-summary">
        <h3 className="text-base font-bold text-green-400 mb-4 flex items-center gap-2">
          <History className="w-4 h-4" /> Recent Activity Summary
        </h3>
        <div className="space-y-3 text-sm">
          {[
            { label: "Transactions shown",    val: txs.length,                         color: "text-white" },
            { label: "Fees paid",             val: sends.length,                     color: "text-red-400" },
            { label: "Payments received",     val: receives.length,                  color: "text-green-400" },
            { label: "Spectral earnings",     val: earnings.length,                  color: "text-cyan-400" },
            { label: "Volume out",            val: formatNxt(totalSent) + " NXT",    color: "text-red-400" },
            { label: "Volume earned",         val: formatNxt(totalEarned) + " NXT",  color: "text-green-400" },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-slate-400">{r.label}</span>
              <span className={`font-mono font-semibold ${r.color}`}>{r.val}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-slate-900/60 border-cyan-500/30 p-6" data-testid="card-physics-stats">
        <h3 className="text-base font-bold text-cyan-400 mb-4 flex items-center gap-2">
          <Atom className="w-4 h-4" /> Spectral Physics Stats
        </h3>
        <div className="space-y-3 text-sm">
          {[
            { label: "Avg tx wavelength", val: avgWl.toFixed(1) + " nm",                                    color: "text-purple-400" },
            { label: "Total energy encoded", val: totalEnergy > 0 ? totalEnergy.toExponential(3) + " J" : "—", color: "text-amber-400" },
            { label: "Total Λ mass-equiv.", val: totalEnergy > 0 ? (totalEnergy / (C * C)).toExponential(3) + " kg" : "—", color: "text-amber-400" },
            { label: "Protocol", val: "WNSP E=hf · Λ=hf/c²",                                              color: "text-cyan-400" },
            { label: "Token supply cap", val: "21B NXT",                                                    color: "text-slate-400" },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-slate-400">{r.label}</span>
              <span className={`font-mono font-semibold ${r.color}`}>{r.val}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="md:col-span-2 bg-gradient-to-br from-slate-900/60 to-indigo-950/40 border-indigo-500/20 p-6" data-testid="card-lambda-explainer">
        <h3 className="text-base font-bold text-indigo-400 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Lambda Boson Transaction Encoding
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Every NXT transfer is assigned a unique wavelength derived from the transaction amount. The photon
          energy E=hf at that wavelength provides physics-verified proof of work, and Λ=hf/c² gives each
          transaction a mass-equivalent "weight" — higher-value transfers carry heavier Λ signatures.
        </p>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          {[
            { val: "E = hf", sub: "Photon energy", color: "text-cyan-400" },
            { val: "Λ = hf/c²", sub: "Mass equivalent", color: "text-purple-400" },
            { val: "0.1% fee", sub: "Per transfer", color: "text-amber-400" },
          ].map(s => (
            <div key={s.val} className="bg-slate-800/50 rounded-lg p-3">
              <div className={`font-mono font-bold text-lg ${s.color}`}>{s.val}</div>
              <div className="text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Main wallet page ───────────────────────────────────────────────────────────
export default function WalletPage() {
  const qc = useQueryClient();
  const [sendAmount, setSendAmount] = useState("");
  const [sendAddress, setSendAddress] = useState("");
  const [sendMemo, setSendMemo] = useState("");
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  const { data, isLoading, isError, refetch } = useQuery<WalletData>({
    queryKey: ["/api/wallet"],
    queryFn: () => fetch("/api/wallet", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 15_000,
  });

  const wallet = data?.wallet;
  const txs    = data?.recentTransactions ?? [];
  const balance      = wallet ? parseFloat(wallet.balance) : 0;
  const locked       = wallet ? parseFloat(wallet.lockedBalance) : 0;
  const available    = balance - locked;

  const transfer = useMutation({
    mutationFn: async (body: { toAddress: string; amount: string; memo?: string }) => {
      const r = await fetch("/api/wallet/transfer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Transfer failed");
      return json;
    },
    onSuccess: () => {
      setSendSuccess("Transfer confirmed.");
      setSendAmount(""); setSendAddress(""); setSendMemo(""); setSendError("");
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      setTimeout(() => setSendSuccess(""), 4000);
    },
    onError: (e: any) => { setSendError(e.message); },
  });

  const handleSend = () => {
    setSendError(""); setSendSuccess("");
    if (!sendAmount || !sendAddress) return;
    transfer.mutate({ toAddress: sendAddress, amount: sendAmount, memo: sendMemo || undefined });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Wallet className="w-10 h-10 text-amber-400 animate-pulse mx-auto" />
        <p className="text-slate-400">Loading wallet…</p>
      </div>
    </div>
  );

  if (isError || !wallet) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <p className="text-slate-400">Could not load wallet. Please log in.</p>
        <Link href="/auth"><Button>Login</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-slate-400 hover:text-white" data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Wallet className="w-10 h-10 text-amber-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent" data-testid="text-title">
              NXT Wallet
            </h1>
          </div>
          <p className="text-amber-300/80 text-sm font-mono">Λ=hf/c² · Spectral-encoded transactions · 21B supply cap</p>
        </div>

        {/* balance + address */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          <Card className="lg:col-span-2 bg-gradient-to-br from-amber-950/40 to-orange-950/20 border-amber-500/30 p-6" data-testid="card-balance">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-amber-400 text-xs flex items-center gap-1.5 mb-1.5">
                  <Coins className="w-3.5 h-3.5" /> TOTAL BALANCE
                </div>
                <div className="text-4xl md:text-5xl font-bold text-white font-mono" data-testid="text-balance">
                  {formatNxt(balance)} <span className="text-xl text-amber-400">NXT</span>
                </div>
                <div className="text-slate-500 text-xs mt-1 font-mono">{balance.toFixed(8)} NXT exact</div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <Shield className="w-3 h-3 mr-1" /> Secured
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-900/60 rounded-xl p-4">
                <div className="text-slate-500 text-xs mb-1">Available</div>
                <div className="text-xl font-bold text-green-400 font-mono" data-testid="text-available">
                  {formatNxt(available)} NXT
                </div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-4">
                <div className="text-slate-500 text-xs mb-1">Locked / Staking</div>
                <div className="text-xl font-bold text-purple-400 font-mono" data-testid="text-locked">
                  {formatNxt(locked)} NXT
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs">Wallet Address</span>
                <CopyButton text={wallet.address} />
              </div>
              <div className="font-mono text-amber-400 text-sm break-all" data-testid="text-address">
                {wallet.address}
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/60 border-indigo-500/30 p-6 space-y-3" data-testid="card-quick-actions">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Quick Actions</h3>
            <Link href="/profile">
              <Button variant="outline" className="w-full border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40" data-testid="button-profile">
                View Identity Profile
              </Button>
            </Link>
            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
              {[
                { label: "Token",        val: "NXT (8 decimals)" },
                { label: "Total supply", val: "21,000,000,000 NXT" },
                { label: "Protocol",     val: "WNSP E=hf" },
                { label: "Fee model",    val: "Λ=hf/c² energy cost" },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-mono text-slate-300">{r.val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* tabs */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/50" data-testid="tabs-wallet">
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <History className="w-4 h-4 mr-2" /> History
            </TabsTrigger>
            <TabsTrigger value="send" data-testid="tab-send">
              <Send className="w-4 h-4 mr-2" /> Send
            </TabsTrigger>
            <TabsTrigger value="stats" data-testid="tab-stats">
              <Atom className="w-4 h-4 mr-2" /> Stats
            </TabsTrigger>
          </TabsList>

          {/* ── History ── */}
          <TabsContent value="transactions" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" /> Recent Transactions
              </h2>
              <span className="text-xs text-slate-600">{txs.length} loaded</span>
            </div>

            {txs.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800 p-8 text-center">
                <Coins className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No transactions yet.</p>
                <p className="text-slate-600 text-xs mt-1">Send or receive NXT to see your history here.</p>
              </Card>
            ) : (
              <div className="space-y-2" data-testid="tx-list">
                {txs.map(tx => (
                  <TxRow key={tx.id} tx={tx} walletId={""} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Send ── */}
          <TabsContent value="send" className="space-y-5">
            <Card className="bg-slate-900/60 border-blue-500/30 p-6" data-testid="card-send-form">
              <h2 className="text-base font-bold text-blue-400 mb-5 flex items-center gap-2">
                <Send className="w-4 h-4" /> Send NXT
              </h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wider">Recipient Address</Label>
                  <Input
                    data-testid="input-recipient"
                    value={sendAddress}
                    onChange={e => setSendAddress(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white mt-1.5 font-mono"
                    placeholder="NXT-XXXX-XXXX-XXXX-XXXX"
                  />
                </div>

                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wider">Amount (NXT)</Label>
                  <div className="relative">
                    <Input
                      data-testid="input-amount"
                      value={sendAmount}
                      onChange={e => setSendAmount(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white mt-1.5 font-mono pr-16"
                      placeholder="0.00000000"
                      type="number"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-mono text-xs mt-0.5">NXT</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 mt-1.5">
                    <span>Available: {formatNxt(available)} NXT</span>
                    <button
                      className="text-blue-400 hover:text-blue-300"
                      data-testid="button-max"
                      onClick={() => setSendAmount(available.toFixed(8))}
                    >MAX</button>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wider">Memo (optional)</Label>
                  <Input
                    data-testid="input-memo"
                    value={sendMemo}
                    onChange={e => setSendMemo(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white mt-1.5 text-sm"
                    placeholder="Note for this transfer"
                  />
                </div>

                {/* Physics preview */}
                <FeePreview amount={sendAmount} />

                {sendError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {sendError}
                  </div>
                )}
                {sendSuccess && (
                  <div className="flex items-center gap-2 text-green-400 text-sm bg-green-950/40 border border-green-500/30 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" /> {sendSuccess}
                  </div>
                )}

                <Button
                  data-testid="button-send"
                  onClick={handleSend}
                  disabled={transfer.isPending || !sendAmount || !sendAddress}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                >
                  {transfer.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send Transaction</>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ── Stats ── */}
          <TabsContent value="stats">
            <StatsPanel txs={txs} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
