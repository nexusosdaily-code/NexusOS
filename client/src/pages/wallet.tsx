import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Wallet, Send, ArrowDownLeft, ArrowUpRight, ArrowLeft, Copy, CheckCircle,
  Clock, Zap, RefreshCw, Shield, Coins, History, Atom, AlertCircle,
  Lock, Delete, KeyRound, X,
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
interface UnifiedTx {
  id: string;
  source: "nxt" | "lightning";
  type: string;
  label: string;
  amountNxt: string | null;
  amountSats: number | null;
  status: string;
  createdAt: string;
  spectralSig: string | null;
  wavelength: string | null;
  energyCost: string | null;
  memo: string | null;
  fromWalletId: string | null;
  toWalletId: string | null;
  fee: string;
}

interface WalletData {
  wallet: {
    id: string; address: string; balance: string; lockedBalance: string;
    satsBalance: number; satsStaked: number; wnusdMinted: number; wnusdColSats: number;
  };
  recentTransactions: UnifiedTx[];
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

// ── WNSP-SIG chip ─────────────────────────────────────────────────────────────
function WnspSigChip({ sig }: { sig?: string | null }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  if (!sig) return null;
  const short = sig.length > 48 ? sig.slice(0, 48) + "…" : sig;
  return (
    <div className="mt-1.5 rounded border border-violet-900/40 bg-violet-950/20 px-2 py-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest shrink-0">WNSP-SIG</span>
        <span
          className="text-[9px] font-mono text-violet-300/70 truncate flex-1 cursor-pointer"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? sig : short}
        </span>
        <button
          className="text-violet-500 hover:text-violet-300 shrink-0 ml-1"
          onClick={() => { navigator.clipboard.writeText(sig); toast({ title: "Spectral signature copied" }); }}
          title="Copy WNSP-SIG"
        >
          <Copy className="w-2.5 h-2.5" />
        </button>
      </div>
      {expanded && (
        <div className="mt-0.5 text-[8px] text-violet-400/50 font-mono">
          SHA-256(tx) ⊕ hex(λ) · verifiable via CE encoder
        </div>
      )}
    </div>
  );
}

// ── Transaction row ────────────────────────────────────────────────────────────
// Direction logic per type
const INCOMING_TYPES = new Set([
  "message_earning", "stream_earning", "document_earning",
  "deposit", "receive_p2p", "tip_received", "swap_to_nxt",
]);
const SWAP_TYPES = new Set(["swap_to_nxt", "swap_to_sats"]);
const BURN_TYPES = new Set(["protocol_burn"]);

function txDirection(tx: UnifiedTx, walletId: string): "receive" | "send" | "swap" | "burn" {
  if (BURN_TYPES.has(tx.type)) return "burn";
  if (SWAP_TYPES.has(tx.type)) return "swap";
  if (INCOMING_TYPES.has(tx.type)) return "receive";
  if (tx.source === "nxt" && tx.toWalletId === walletId) return "receive";
  return "send";
}

function TxRow({ tx, walletId }: { tx: UnifiedTx; walletId: string }) {
  const dir   = txDirection(tx, walletId);
  const nm    = tx.wavelength ? parseFloat(tx.wavelength) : 545;
  const color = nmToRgb(nm);

  const iconBg =
    dir === "burn"    ? "bg-orange-500/15 text-orange-400" :
    dir === "swap"    ? "bg-cyan-500/15 text-cyan-400" :
    dir === "receive" ? "bg-green-500/15 text-green-400" :
                        "bg-red-500/15 text-red-400";

  const icon =
    dir === "burn"    ? "🔥" :
    dir === "swap"    ? <Zap className="w-4 h-4" /> :
    dir === "receive" ? <ArrowDownLeft className="w-4 h-4" /> :
                        <ArrowUpRight className="w-4 h-4" />;

  const sourceBadge = tx.source === "lightning"
    ? <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-mono">⚡ LN</span>
    : <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono">NXT</span>;

  const statusColor = tx.status === "completed" || tx.status === "confirmed"
    ? "bg-green-500/15 text-green-400"
    : tx.status === "failed"
    ? "bg-red-500/15 text-red-400"
    : "bg-amber-500/15 text-amber-400";

  // Amount display
  const amountDisplay = (() => {
    if (tx.source === "lightning" && tx.amountSats != null) {
      const sats = tx.amountSats;
      const nxtEq = sats / 1000;
      return (
        <div>
          <div className={`font-mono font-bold text-sm ${
            dir === "burn" ? "text-orange-400" :
            dir === "swap" ? "text-cyan-400" :
            dir === "receive" ? "text-green-400" : "text-red-400"
          }`}>
            {dir === "receive" ? "+" : "−"}{sats.toLocaleString()} sats
          </div>
          <div className="text-[10px] text-slate-500 font-mono">≈ {formatNxt(nxtEq)} NXT</div>
        </div>
      );
    }
    if (tx.amountNxt != null) {
      return (
        <div className={`font-mono font-bold text-sm ${
          dir === "burn" ? "text-orange-400" :
          dir === "swap" ? "text-cyan-400" :
          dir === "receive" ? "text-green-400" : "text-red-400"
        }`}>
          {dir === "burn" ? "🔥 " : dir === "receive" ? "+" : "−"}{formatNxt(tx.amountNxt)} NXT
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 hover:border-slate-700 transition-colors"
      data-testid={`tx-row-${tx.id}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-white font-medium">{tx.label}</span>
            {sourceBadge}
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${statusColor}`}>
              {tx.status}
            </span>
          </div>
          {tx.wavelength && (
            <div className="flex items-center gap-2 text-[10px] mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span style={{ color }} className="font-mono">{nm.toFixed(1)} nm</span>
              {tx.energyCost && <span className="text-slate-600">· Λ={parseFloat(tx.energyCost).toExponential(2)} J</span>}
            </div>
          )}
          {tx.memo && (
            <div className="text-[10px] text-slate-600 font-mono truncate mt-0.5">{tx.memo}</div>
          )}
          <WnspSigChip sig={tx.spectralSig} />
        </div>

        <div className="text-right flex-shrink-0">
          {amountDisplay}
          <div className="text-[10px] text-slate-600 flex items-center justify-end gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {fmtTime(tx.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stats panel ────────────────────────────────────────────────────────────────
function StatsPanel({ txs }: { txs: UnifiedTx[] }) {
  const lnTxs   = txs.filter(t => t.source === "lightning");
  const nxtTxs  = txs.filter(t => t.source === "nxt");
  const deposits = lnTxs.filter(t => t.type === "deposit");
  const withdrawals = lnTxs.filter(t => t.type === "withdrawal" || t.type === "send_to_ln" || t.type === "btc_withdrawal");
  const swaps   = lnTxs.filter(t => t.type === "swap_to_nxt" || t.type === "swap_to_sats");
  const totalDepositedSats = deposits.reduce((s, t) => s + (t.amountSats ?? 0), 0);
  const totalWithdrawnSats = withdrawals.reduce((s, t) => s + (t.amountSats ?? 0), 0);
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
            { label: "Total transactions",      val: txs.length,                                                color: "text-white" },
            { label: "Lightning txs",           val: lnTxs.length,                                             color: "text-yellow-400" },
            { label: "NXT txs",                 val: nxtTxs.length,                                            color: "text-amber-400" },
            { label: "Deposits",                val: deposits.length,                                          color: "text-green-400" },
            { label: "Sats deposited",          val: totalDepositedSats.toLocaleString() + " sats",            color: "text-green-400" },
            { label: "Sats withdrawn",          val: totalWithdrawnSats.toLocaleString() + " sats",            color: "text-red-400" },
            { label: "Swaps",                   val: swaps.length,                                             color: "text-cyan-400" },
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

// ── PIN numpad modal ────────────────────────────────────────────────────────────
function PinModal({
  mode, onConfirm, onCancel, error, loading,
}: {
  mode: "setup" | "confirm";
  onConfirm: (pin: string, confirmPin?: string) => void;
  onCancel: () => void;
  error: string;
  loading: boolean;
}) {
  const [phase, setPhase]   = useState<"enter" | "confirm">("enter");
  const [digits, setDigits] = useState("");
  const [conf,   setConf]   = useState("");

  const active = phase === "enter" ? digits : conf;
  const setActive = (v: string) => phase === "enter" ? setDigits(v) : setConf(v);

  const press = (d: string) => {
    if (active.length < 4) setActive(active + d);
  };
  const del = () => setActive(active.slice(0, -1));

  const next = () => {
    if (active.length < 4) return;
    if (mode === "confirm" || phase === "confirm") {
      onConfirm(mode === "setup" ? digits : active, mode === "setup" ? conf : undefined);
    } else {
      // setup first phase done → go to confirm phase
      setPhase("confirm");
    }
  };

  const title = mode === "setup"
    ? (phase === "enter" ? "Set your wallet PIN" : "Confirm your PIN")
    : "Enter PIN to confirm";
  const subtitle = mode === "setup"
    ? (phase === "enter" ? "Choose a 4-digit PIN for all transfers" : "Re-enter the same PIN")
    : "Required to authorise this transfer";

  const dots = Array.from({ length: 4 }, (_, i) => (
    <div
      key={i}
      className={`w-4 h-4 rounded-full border-2 transition-all ${
        i < active.length
          ? "bg-amber-400 border-amber-400 scale-110"
          : "bg-transparent border-slate-600"
      }`}
    />
  ));

  const pad = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-80 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-slate-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-white font-semibold">{title}</h3>
          <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-5">{dots}</div>

        {/* Error */}
        {error && (
          <div className="text-red-400 text-xs text-center mb-3 bg-red-950/40 rounded-lg px-3 py-2 border border-red-500/30">
            {error}
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {pad.map((k, i) => (
            k === "" ? <div key={i} /> :
            k === "⌫" ? (
              <button
                key={i}
                onClick={del}
                data-testid="pin-backspace"
                className="h-12 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <Delete className="w-4 h-4" />
              </button>
            ) : (
              <button
                key={i}
                onClick={() => press(k)}
                data-testid={`pin-key-${k}`}
                className="h-12 rounded-xl bg-slate-800 text-white font-bold text-lg hover:bg-slate-700 active:scale-95 transition-all"
              >
                {k}
              </button>
            )
          ))}
        </div>

        <button
          data-testid="pin-confirm"
          onClick={next}
          disabled={active.length < 4 || loading}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {loading ? "Processing…"
            : mode === "setup" && phase === "enter" ? "Next →"
            : mode === "setup" ? "Set PIN & Send"
            : "Confirm Transfer"}
        </button>
      </div>
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

  // PIN state
  const [pinModal, setPinModal] = useState<"setup" | "confirm" | null>(null);
  const [pinError, setPinError] = useState("");

  const { data, isLoading, isError, refetch } = useQuery<WalletData>({
    queryKey: ["/api/wallet"],
    queryFn: () => fetch("/api/wallet", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    refetchInterval: 15_000,
  });

  const { data: pinStatus, refetch: refetchPin } = useQuery<{ pinSet: boolean }>({
    queryKey: ["/api/wallet/pin/status"],
    queryFn: () => fetch("/api/wallet/pin/status", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
  });

  const wallet = data?.wallet;
  const txs    = data?.recentTransactions ?? [];
  const balance      = wallet ? parseFloat(wallet.balance) : 0;
  const locked       = wallet ? parseFloat(wallet.lockedBalance) : 0;
  const available    = balance - locked;
  const satsLiquid   = wallet?.satsBalance  ?? 0;
  const satsStaked   = wallet?.satsStaked   ?? 0;
  const wnusdMinted  = wallet?.wnusdMinted  ?? 0;
  const wnusdColSats = wallet?.wnusdColSats ?? 0;

  const setPin = useMutation({
    mutationFn: async (pin: string) => {
      const r = await fetch("/api/wallet/pin/set", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ pin }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed to set PIN");
      return json;
    },
  });

  const transfer = useMutation({
    mutationFn: async (body: { toAddress: string; amount: string; memo?: string; pin?: string }) => {
      const r = await fetch("/api/wallet/transfer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Transfer failed");
      return json;
    },
    onSuccess: () => {
      setSendSuccess("Transfer confirmed.");
      setSendAmount(""); setSendAddress(""); setSendMemo(""); setSendError("");
      setPinModal(null); setPinError("");
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      setTimeout(() => setSendSuccess(""), 4000);
    },
    onError: (e: any) => {
      setPinError(""); setSendError(e.message);
      setPinModal(null);
    },
  });

  const handleSend = () => {
    setSendError(""); setSendSuccess(""); setPinError("");
    if (!sendAmount || !sendAddress) return;
    if (pinStatus?.pinSet) {
      setPinModal("confirm");
    } else {
      setPinModal("setup");
    }
  };

  const handlePinConfirm = async (pin: string, confirmPin?: string) => {
    setPinError("");
    try {
      if (pinModal === "setup") {
        if (pin !== confirmPin) { setPinError("PINs don't match — try again"); return; }
        await setPin.mutateAsync(pin);
        refetchPin();
      }
      transfer.mutate({ toAddress: sendAddress, amount: sendAmount, memo: sendMemo || undefined, pin });
    } catch (e: any) {
      setPinError(e.message);
    }
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

      {/* PIN modal overlay */}
      {pinModal && (
        <PinModal
          mode={pinModal}
          onConfirm={handlePinConfirm}
          onCancel={() => { setPinModal(null); setPinError(""); }}
          error={pinError}
          loading={transfer.isPending || setPin.isPending}
        />
      )}

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
                  <Coins className="w-3.5 h-3.5" /> TOTAL NXT BALANCE
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

            {/* NXT liquid / locked */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-900/60 rounded-xl p-3">
                <div className="text-slate-500 text-xs mb-1">Available NXT</div>
                <div className="text-lg font-bold text-green-400 font-mono" data-testid="text-available">
                  {formatNxt(available)} NXT
                </div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-3">
                <div className="text-slate-500 text-xs mb-1">Locked / Staking</div>
                <div className="text-lg font-bold text-purple-400 font-mono" data-testid="text-locked">
                  {formatNxt(locked)} NXT
                </div>
              </div>
            </div>

            {/* Sats + WNUSD staked liquidity */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-orange-950/30 border border-orange-500/20 rounded-xl p-3">
                <div className="text-orange-400/70 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Sats Liquid
                </div>
                <div className="text-base font-bold text-orange-300 font-mono" data-testid="text-sats-liquid">
                  {satsLiquid.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">sats</div>
              </div>
              <div className="bg-yellow-950/30 border border-yellow-500/20 rounded-xl p-3">
                <div className="text-yellow-400/70 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Sats Staked
                </div>
                <div className="text-base font-bold text-yellow-300 font-mono" data-testid="text-sats-staked">
                  {satsStaked.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">sats locked</div>
              </div>
              <div className="bg-teal-950/30 border border-teal-500/20 rounded-xl p-3">
                <div className="text-teal-400/70 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Coins className="w-3 h-3" /> WNUSD Minted
                </div>
                <div className="text-base font-bold text-teal-300 font-mono" data-testid="text-wnusd-minted">
                  ${wnusdMinted >= 1e6 ? (wnusdMinted / 1e6).toFixed(3) + "M" : wnusdMinted.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{wnusdColSats.toLocaleString()} col. sats</div>
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
                  <TxRow key={tx.id} tx={tx} walletId={wallet.id} />
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

                {/* PIN status indicator */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                  pinStatus?.pinSet
                    ? "bg-amber-950/40 border-amber-500/30 text-amber-400"
                    : "bg-slate-800/50 border-slate-700 text-slate-500"
                }`}>
                  <Lock className="w-3.5 h-3.5" />
                  {pinStatus?.pinSet ? "PIN protected — you'll be prompted to confirm" : "No PIN set — you'll create one on first send"}
                </div>

                <Button
                  data-testid="button-send"
                  onClick={handleSend}
                  disabled={transfer.isPending || !sendAmount || !sendAddress}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                >
                  {transfer.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
                  ) : pinStatus?.pinSet ? (
                    <><Lock className="w-4 h-4 mr-2" /> Send (PIN required)</>
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
